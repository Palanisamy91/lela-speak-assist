// Voice Session microphone control, tested on the real LelaConversationService with a fake speech engine.
// The fake records every speak/listen start and end and flags any moment where the microphone and Lela's voice overlap.
import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LelaConversationService } from '../src/app/lela/lela-conversation.service';
import { SpeechService } from '../src/app/services/speech.service';
import { StorageService } from '../src/app/core/storage.service';
import { LelaDataService } from '../src/app/lela/lela-data.service';
import { CONVERSATION_BRAIN } from '../src/app/lela/conversation-brain';
import { LELA_CORRECTOR } from '../src/app/lela/lela-corrector';
import { VocabCollectorService } from '../src/app/core/vocab-collector.service';

class FakeSpeech {
  voices = signal<unknown[]>([]);
  synthesisSupported = true;
  recognitionSupported = true;
  listenState = signal<'idle' | 'starting' | 'listening'>('idle');
  speaking = signal(false);
  log: string[] = [];
  violations: string[] = [];
  failNextSpeech = false;
  private endSpeech: (() => void) | null = null;
  private rec: Subject<{ transcript: string; isFinal: boolean }> | null = null;

  async requestMicPermission() { return 'granted' as const; }

  speak(text: string): Observable<void> {
    return new Observable<void>((sub) => {
      if (this.listenState() !== 'idle') this.violations.push(`speech started while microphone was ${this.listenState()}: ${text}`);
      this.log.push(`speak:start`);
      if (this.failNextSpeech) { this.failNextSpeech = false; this.log.push('speak:error'); sub.error(new Error('speech engine failed')); return; }
      this.speaking.set(true);
      this.endSpeech = () => { this.speaking.set(false); this.log.push('speak:end'); this.endSpeech = null; sub.complete(); };
      return () => { if (this.endSpeech) { this.speaking.set(false); this.log.push('speak:cancel'); this.endSpeech = null; } };
    });
  }
  /** The real onend event of the current utterance. */
  finishSpeech(): void { this.endSpeech?.(); }
  get isSpeaking(): boolean { return this.endSpeech !== null; }

  listen(): Observable<{ transcript: string; isFinal: boolean }> {
    return new Observable((sub) => {
      if (this.speaking()) this.violations.push('microphone started while Lela was speaking');
      if (this.rec) this.violations.push('two recognition sessions overlap');
      this.log.push('listen:start');
      this.listenState.set('listening');
      this.rec = new Subject();
      const inner = this.rec.subscribe(sub);
      return () => { inner.unsubscribe(); this.rec = null; this.listenState.set('idle'); this.log.push('listen:stop'); };
    });
  }
  say(text: string): void { this.rec?.next({ transcript: text, isFinal: true }); }
  stopListening(): void { const r = this.rec; if (r) { this.listenState.set('idle'); r.complete(); } }
  stopSpeaking(): void { if (this.endSpeech) { this.speaking.set(false); this.log.push('speak:cancel'); this.endSpeech = null; } }
}

function make() {
  const speech = new FakeSpeech();
  let n = 0;
  const brain = {
    kind: 'database' as const,
    topics: async () => [],
    configure: async () => undefined,
    start: async () => ({ lines: [{ text: 'Hello, I am Lela.' }], ask: { text: 'How are you?', kind: 'free' }, topic: null }),
    next: async () => ({ lines: [{ text: `Nice ${++n}.` }], ask: { text: 'Tell me more?', kind: 'free' }, topic: null }),
    findTopic: async () => null, goToTopic: async () => ({ lines: [], ask: null, topic: null }), nextTopic: async () => ({ lines: [], ask: null, topic: null }), skip: async () => ({ lines: [], ask: null, topic: null }),
  };
  const data = {
    db: async () => ({ modes: [{ id: 'free', title: 'Free' }], intents: [], topics: [] }),
    phraseBook: async () => ({ pick: (k: string) => ({ text: k, tamil: '' }) }),
  };
  const corrector = { kind: 'rules', correct: async (t: string) => ({ original: t, corrected: t, changed: false, explanations: [], kind: 'rules' }) };
  const collector = { collectFromMessages: async () => undefined, collectTaught: async () => undefined, collectText: async () => undefined, wordsIn: () => [] };
  const injector = Injector.create({
    providers: [
      { provide: SpeechService, useValue: speech }, { provide: StorageService, useValue: { read: () => null, write: () => undefined } },
      { provide: LelaDataService, useValue: data }, { provide: CONVERSATION_BRAIN, useValue: brain }, { provide: LELA_CORRECTOR, useValue: corrector },
      { provide: VocabCollectorService, useValue: collector },
    ],
  });
  const lela = runInInjectionContext(injector, () => new LelaConversationService());
  return { lela, speech };
}

const until = async (cond: () => boolean, what: string, ms = 6000) => {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) throw new Error(`timed out waiting for: ${what}\nlog: ${(globalThis as { __log?: string[] }).__log?.join(',')}`); await new Promise((r) => setTimeout(r, 20)); }
};
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function startSession(lela: LelaConversationService) {
  await lela.load();
  lela.beginSession();
  void lela.start();
}

test('Voice Session: microphone OFF while Lela speaks first; ON only after her real end of speech', async () => {
  const { lela, speech } = make();
  (globalThis as { __log?: string[] }).__log = speech.log;
  await startSession(lela);
  await until(() => speech.isSpeaking, 'Lela starts speaking');
  assert.equal(speech.listenState(), 'idle');                      // microphone OFF at the start
  assert.match(lela.micStatusText(), /OFF.*speaking/);             // never "Listening" while Lela speaks
  await pause(900);                                                // long after she began: still no microphone (no timer starts it)
  assert.equal(speech.log.includes('listen:start'), false);
  assert.equal(lela.phase(), 'speaking');
  speech.finishSpeech();                                           // the real onend
  await until(() => speech.listenState() === 'listening', 'microphone turns ON after speech ended');
  assert.ok(speech.log.indexOf('speak:end') < speech.log.indexOf('listen:start'));
  assert.match(lela.micStatusText(), /ON.*Listening/);
  assert.deepEqual(speech.violations, []);
  lela.endSession();
});

test('Voice Session: full cycles - mic OFF while Lela processes and answers, ON again only after she finishes (3 cycles)', async () => {
  const { lela, speech } = make();
  await startSession(lela);
  await until(() => speech.isSpeaking, 'greeting');
  speech.finishSpeech();
  for (let cycle = 1; cycle <= 3; cycle++) {
    await until(() => speech.listenState() === 'listening', `cycle ${cycle}: listening`);
    speech.say(`I am fine number ${cycle}`);
    // the user finished: recognition must be stopped BEFORE Lela's reply begins
    await until(() => speech.isSpeaking, `cycle ${cycle}: Lela answers`, 9000);
    assert.equal(speech.listenState(), 'idle', 'microphone must be OFF while Lela speaks');
    assert.equal(lela.messages().filter((m) => m.from === 'user').length, cycle);
    assert.equal(lela.messages().filter((m) => m.from === 'user').at(-1)?.text, `I am fine number ${cycle}`); // transcript kept once, unchanged
    speech.finishSpeech();
  }
  await until(() => speech.listenState() === 'listening', 'listening again after the last answer');
  assert.deepEqual(speech.violations, []);
  // every speak:start is preceded by a listen:stop (or by no listening at all), every listen:start by a speak:end
  let micOn = false, talking = false;
  for (const e of speech.log) {
    if (e === 'listen:start') { assert.equal(talking, false, 'mic on while speaking'); micOn = true; }
    if (e === 'listen:stop') micOn = false;
    if (e === 'speak:start') { assert.equal(micOn, false, 'speech started with the mic still on'); talking = true; }
    if (e === 'speak:end' || e === 'speak:cancel' || e === 'speak:error') talking = false;
  }
  lela.endSession();
});

test('Voice Session: Stop while Lela is speaking stops her, keeps the microphone OFF and never restarts', async () => {
  const { lela, speech } = make();
  await startSession(lela);
  await until(() => speech.isSpeaking, 'greeting');
  lela.stopSession();
  assert.equal(speech.isSpeaking, false);
  assert.equal(speech.listenState(), 'idle');
  assert.equal(lela.autoListen(), false);
  assert.equal(lela.micOn(), false);
  await pause(1200);
  assert.equal(speech.log.includes('listen:start'), false);
  assert.match(lela.micStatusText(), /OFF/);
});

test('Voice Session: Stop while the microphone is listening stops it at once, sends nothing, no restart', async () => {
  const { lela, speech } = make();
  await startSession(lela);
  await until(() => speech.isSpeaking, 'greeting');
  speech.finishSpeech();
  await until(() => speech.listenState() === 'listening', 'listening');
  lela.stopSession();
  assert.equal(speech.listenState(), 'idle');
  await pause(1500);
  assert.equal(speech.log.filter((e) => e === 'listen:start').length, 1);   // no automatic restart
  assert.equal(lela.messages().filter((m) => m.from === 'user').length, 0);
  assert.equal(lela.phase(), 'idle');
});

test('Voice Session: if Lela\'s speech fails the microphone does not start by itself and the status says so', async () => {
  const { lela, speech } = make();
  speech.failNextSpeech = true;
  await startSession(lela);
  await until(() => speech.log.includes('speak:error'), 'speech error');
  await pause(1200);
  assert.equal(speech.log.includes('listen:start'), false);
  assert.match(lela.micStatusText(), /could not speak|OFF/);
  assert.match(lela.micStatusText(), /OFF/);
});

test('Voice Session: leaving the session cancels the pending automatic listening', async () => {
  const { lela, speech } = make();
  await startSession(lela);
  await until(() => speech.isSpeaking, 'greeting');
  speech.finishSpeech();
  lela.endSession();                       // exit right after Lela finished, before the microphone could start
  await pause(1200);
  assert.equal(speech.log.includes('listen:start'), false);
  assert.equal(lela.sessionMode(), false);
  assert.equal(lela.micOn(), false);
});

test('Voice Session: re-entering starts fresh with Lela speaking first and the microphone OFF', async () => {
  const { lela, speech } = make();
  await startSession(lela);
  await until(() => speech.isSpeaking, 'first greeting');
  lela.endSession();
  speech.log.length = 0;
  lela.beginSession();
  void lela.newConversation();
  await until(() => speech.isSpeaking, 'second greeting');
  assert.equal(speech.listenState(), 'idle');
  assert.equal(speech.log[0], 'speak:start');
  assert.equal(lela.messages().filter((m) => m.from === 'lela').length >= 1, true);
  assert.equal(lela.messages().some((m) => m.from === 'user'), false);
  lela.endSession();
});

test('other sessions: without a Voice Session there is no automatic listening', async () => {
  const { lela, speech } = make();
  await lela.load();
  lela.setAutoListen(false); lela.setMicOn(false); lela.setLiveMode(false);
  void lela.start();
  await until(() => speech.isSpeaking, 'greeting');
  speech.finishSpeech();
  await pause(1200);
  assert.equal(speech.log.includes('listen:start'), false);
  assert.equal(lela.sessionMode(), false);
  assert.equal(lela.micStatusText(), '');
});
