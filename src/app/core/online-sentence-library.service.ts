import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import type { ContentCategory, Sentence, Tense } from '../models/learning.models';
import type { TenseId } from '../lela/tense-data';
import { classifyOnlineTense } from '../lela/online-tense-classifier';
import { DataService } from './data.service';

const API = 'https://api.tatoeba.org/v1/sentences';
const CACHE_KEY = 'lela.online-sentences.v1';
const SYNC_KEY = 'lela.online-sentences.last-sync.v1';
const SYNC_FAILURE_KEY = 'lela.online-sentences.last-failure.v1';
const CURSOR_KEY = 'lela.online-sentences.cursor.v1';
const DAILY_SEEN_KEY = 'lela.online-sentences.daily-seen.v1';
const DAILY_PLAN_PREFIX = 'lela.online-sentences.daily-plan.';
const TENSE_SYNC_PREFIX = 'lela.online-sentences.tense-sync.';
const MAX_CACHE = 3000;
const MAX_RESPONSE = 100;
const ONE_DAY = 24 * 60 * 60 * 1000;

interface TatoebaSentence {
  id: number;
  text: string;
  lang: string;
  license: string;
  owner?: string | null;
  is_unapproved?: boolean;
  is_direct?: boolean;
  translations?: TatoebaSentence[];
}
interface TatoebaResponse { data?: TatoebaSentence[]; paging?: { next?: string | null; has_next?: boolean } }
export interface OnlineSentenceSyncResult { sentences: Sentence[]; added: number; source: 'online' | 'cache' }

function storageGet(key: string): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, value: string): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch { /* Private browsing / quota: online use still works for this session. */ }
}
function normalise(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function isAllowedLicense(value: string): boolean { return value === 'CC BY 2.0 FR' || value === 'CC0 1.0'; }
function toBroadTense(id: TenseId): Tense {
  if (id.startsWith('past-')) return 'past';
  if (id.startsWith('future-')) return 'future';
  if (id === 'present-continuous') return 'present-continuous';
  if (id === 'present-perfect') return 'present-perfect';
  return 'present';
}


@Injectable({ providedIn: 'root' })
export class OnlineSentenceLibraryService {
  private readonly http = inject(HttpClient);
  private readonly data = inject(DataService);
  private existingKeysPromise?: Promise<{ english: Set<string>; tamil: Set<string> }>;

  cached(): Sentence[] { return this.readCache(); }

  /** Syncs at most once per day. All online content is text-only and validated before it is cached. */
  async syncIfDue(force = false): Promise<OnlineSentenceSyncResult> {
    const cached = this.readCache();
    const lastSync = Number(storageGet(SYNC_KEY) || 0);
    const lastFailure = Number(storageGet(SYNC_FAILURE_KEY) || 0);
    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (!online || (!force && (Date.now() - lastSync < ONE_DAY || Date.now() - lastFailure < 30 * 60 * 1000))) return { sentences: cached, added: 0, source: 'cache' };

    try {
      const existing = await this.existingKeys();
      const params = this.baseParams();
      const cursor = storageGet(CURSOR_KEY);
      if (cursor) params.set('after', cursor);
      const response = await firstValueFrom(this.http.get<TatoebaResponse>(API, { params }).pipe(timeout({ first: 7000 })));
      const additions = this.mapResponse(response, existing);
      const merged = [...cached];
      const knownIds = new Set(cached.map(item => item.id));
      const knownEnglish = new Set(cached.map(item => normalise(item.en)));
      const knownTamil = new Set(cached.map(item => normalise(item.tamil)));
      for (const item of additions) {
        const en = normalise(item.en), ta = normalise(item.tamil);
        if (knownIds.has(item.id) || !en || !ta || knownEnglish.has(en) || knownTamil.has(ta)) continue;
        merged.push(item); knownIds.add(item.id); knownEnglish.add(en); knownTamil.add(ta);
      }
      const saved = merged.slice(-MAX_CACHE);
      this.writeCache(saved);
      const next = this.readAfterCursor(response.paging?.next);
      if (next) storageSet(CURSOR_KEY, next); else storageSet(CURSOR_KEY, '');
      storageSet(SYNC_KEY, String(Date.now()));
      storageSet(SYNC_FAILURE_KEY, '');
      return { sentences: saved, added: saved.length - cached.length, source: 'online' };
    } catch {
      // Keep the verified offline cache and avoid retrying a failing endpoint on every screen visit.
      storageSet(SYNC_FAILURE_KEY, String(Date.now()));
      return { sentences: cached, added: 0, source: 'cache' };
    }
  }

  /** Fetches a fresh batch for the selected tense. Manual requests aim for 50 new examples. */
  async syncForTense(tense: TenseId, force = false): Promise<Sentence[]> {
    const cached = this.readCache();
    const cachedForTense = cached.filter(item => item.practiceTense === tense);
    const lastSync = Number(storageGet(TENSE_SYNC_PREFIX + tense) || 0);
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || (!force && Date.now() - lastSync < ONE_DAY)) return cachedForTense;

    const queryByTense: Record<TenseId, string[]> = {
      'present-simple': ['usually', 'always', 'often', 'sometimes', 'every day', 'every morning', 'likes', 'works', 'lives', 'needs', 'wants', 'goes'],
      'present-continuous': ['is working', 'are working', 'am working', 'is going', 'are going'],
      'present-perfect': ['has finished', 'have finished', 'has done', 'have done', 'has seen', 'have seen'],
      'present-perfect-continuous': ['has been working', 'have been working', 'has been living', 'have been waiting'],
      'past-simple': ['yesterday', 'last week', 'last night', 'ago', 'visited', 'went'],
      'past-continuous': ['was working', 'were working', 'was going', 'were going'],
      'past-perfect': ['had finished', 'had gone', 'had seen', 'had completed'],
      'past-perfect-continuous': ['had been working', 'had been waiting', 'had been living'],
      'future-simple': ['will go', 'will come', 'will do', 'will help', 'shall'],
      'future-continuous': ['will be working', 'will be going', 'will be waiting'],
      'future-perfect': ['will have finished', 'will have completed', 'will have done'],
      'future-perfect-continuous': ['will have been working', 'will have been waiting'],
    };

    try {
      const existing = await this.existingKeys();
      const merged = [...cached];
      const knownIds = new Set(merged.map(item => item.id));
      const knownEnglish = new Set(merged.map(item => normalise(item.en)));
      const knownTamil = new Set(merged.map(item => normalise(item.tamil)));
      const target = force ? 50 : 15;
      let addedForRequest = 0;
      const queries = queryByTense[tense];

      // Search several phrase patterns; the classifier, direct Tamil translation and licence checks remain mandatory.
      for (let offset = 0; offset < queries.length && addedForRequest < target; offset += 4) {
        const batch = queries.slice(offset, offset + 4);
        const responses = await Promise.all(batch.map(async query => {
          const params = this.baseParams().set('q', query);
          return firstValueFrom(this.http.get<TatoebaResponse>(API, { params }).pipe(timeout({ first: 9000 })));
        }));
        for (const response of responses) {
          const candidates = this.mapResponse(response, existing).filter(item => item.practiceTense === tense);
          for (const item of candidates) {
            if (addedForRequest >= target) break;
            const en = normalise(item.en), ta = normalise(item.tamil);
            if (knownIds.has(item.id) || !en || !ta || knownEnglish.has(en) || knownTamil.has(ta)) continue;
            merged.push(item);
            addedForRequest++;
            knownIds.add(item.id); knownEnglish.add(en); knownTamil.add(ta);
          }
        }
      }
      this.writeCache(merged.slice(-MAX_CACHE));
      storageSet(TENSE_SYNC_PREFIX + tense, String(Date.now()));
      return this.readCache().filter(item => item.practiceTense === tense);
    } catch {
      return cachedForTense;
    }
  }

  /** Returns a few unseen online Tamil-English pairs for today's lesson, then remembers the IDs. */
  dailySentences(excludeIds: string[] = [], count = 3, dayKey = new Date().toISOString().slice(0, 10)): Sentence[] {
    const excluded = new Set(excludeIds);
    const cache = this.readCache();
    const byId = new Map(cache.map(item => [item.id, item]));
    const planKey = DAILY_PLAN_PREFIX + dayKey;
    let planned: string[] = [];
    try {
      const storedPlan: unknown = JSON.parse(storageGet(planKey) || '[]');
      planned = Array.isArray(storedPlan) ? storedPlan.filter((item): item is string => typeof item === 'string') : [];
    } catch { planned = []; }
    const picks = planned.map(id => byId.get(id)).filter((item): item is Sentence => !!item && !excluded.has(item.id)).slice(0, count);

    let seen: string[] = [];
    try {
      const stored: unknown = JSON.parse(storageGet(DAILY_SEEN_KEY) || '[]');
      seen = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : [];
    } catch { seen = []; }
    const seenSet = new Set(seen);
    const pickedIds = new Set(picks.map(item => item.id));
    for (const item of cache) {
      if (picks.length >= count) break;
      if (excluded.has(item.id) || seenSet.has(item.id) || pickedIds.has(item.id)) continue;
      picks.push(item); pickedIds.add(item.id); seenSet.add(item.id);
    }
    storageSet(planKey, JSON.stringify(picks.map(item => item.id)));
    storageSet(DAILY_SEEN_KEY, JSON.stringify([...new Set([...seen, ...picks.map(item => item.id)])].slice(-500)));
    return picks;
  }

  private baseParams(): HttpParams {
    return new HttpParams()
      .set('lang', 'eng')
      .set('trans:lang', 'tam')
      .set('trans:is_direct', 'yes')
      .set('trans:is_unapproved', 'no')
      .set('trans:is_orphan', 'no')
      .set('is_unapproved', 'no')
      .set('is_orphan', 'no')
      .set('showtrans', 'matching')
      .set('showtrans:lang', 'tam')
      .set('showtrans:is_direct', 'yes')
      .set('showtrans:is_unapproved', 'no')
      .set('showtrans:is_orphan', 'no')
      .set('license', 'CC BY 2.0 FR,CC0 1.0')
      .set('sort', 'random')
      .set('limit', String(MAX_RESPONSE));
  }

  private async existingKeys(): Promise<{ english: Set<string>; tamil: Set<string> }> {
    if (!this.existingKeysPromise) {
      const request: Promise<{ english: Set<string>; tamil: Set<string> }> = (async () => {
        const manifest = await this.data.manifest();
        const categories: Sentence[][] = await Promise.all(manifest.sentenceCategories.map((category: ContentCategory) => this.data.sentences(category.id)));
        const all: Sentence[] = categories.flat();
        const english = all.map((item) => normalise(item.en)).filter((value): value is string => Boolean(value));
        const tamil = all.map((item) => normalise(item.tamil)).filter((value): value is string => Boolean(value));
        return { english: new Set<string>(english), tamil: new Set<string>(tamil) };
      })().catch(error => { this.existingKeysPromise = undefined; throw error; });
      this.existingKeysPromise = request;
    }
    return this.existingKeysPromise!;
  }

  private mapResponse(response: TatoebaResponse, existing: { english: Set<string>; tamil: Set<string> }): Sentence[] {
    const output: Sentence[] = [];
    for (const english of response.data ?? []) {
      if (english.lang !== 'eng' || english.is_unapproved || !isAllowedLicense(english.license) || !english.text?.trim()) continue;
      const translations = (english.translations ?? []).filter(tamil => tamil.lang === 'tam' && tamil.is_direct === true && !tamil.is_unapproved && isAllowedLicense(tamil.license) && /[\u0B80-\u0BFF]/u.test(tamil.text ?? ''));
      for (const tamil of translations) {
        const en = english.text.trim(), ta = tamil.text.trim();
        if (en.length > 240 || ta.length > 240 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(en + ta)) continue;
        const enKey = normalise(en), taKey = normalise(ta);
        if (!enKey || !taKey || existing.english.has(enKey) || existing.tamil.has(taKey)) continue;
        const practiceTense = classifyOnlineTense(en);
        const licenses = [...new Set([english.license, tamil.license])];
        const licenseUrl = licenses.map(value => value === 'CC0 1.0'
          ? 'https://creativecommons.org/publicdomain/zero/1.0/'
          : 'https://creativecommons.org/licenses/by/2.0/fr/').join(' · ');
        const sourceAttribution = {
          source: 'Tatoeba', sentenceId: String(english.id), translationId: String(tamil.id),
          url: `https://tatoeba.org/en/sentences/show/${english.id}`,
          license: `${english.license} / ${tamil.license}`, licenseUrl,
          ...(english.owner ? { englishAuthor: english.owner } : {}),
          ...(tamil.owner ? { tamilAuthor: tamil.owner } : {}),
        };
        const credit = `Source: Tatoeba · English sentence #${english.id}${english.owner ? ` by ${english.owner}` : ''} · Tamil translation #${tamil.id}${tamil.owner ? ` by ${tamil.owner}` : ''} · Licence: ${sourceAttribution.license} · Licence details: ${sourceAttribution.licenseUrl} · ${sourceAttribution.url}`;
        output.push({
          id: `tatoeba-${english.id}-${tamil.id}`, en, tamil: ta,
          context: `${credit} This is a community-contributed translation; compare the meaning carefully.`,
          tense: practiceTense ? toBroadTense(practiceTense) : 'present', type: /[?؟]$/.test(en) ? 'question' : /\b(not|never|no)\b/i.test(en) ? 'negative' : 'statement',
          practiceTense: practiceTense ?? undefined, sourceAttribution,
        });
      }
    }
    return output;
  }

  private readAfterCursor(next?: string | null): string | null {
    if (!next) return null;
    try { return new URL(next).searchParams.get('after'); } catch { return null; }
  }

  private readCache(): Sentence[] {
    try {
      const value = JSON.parse(storageGet(CACHE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && typeof item.en === 'string' && typeof item.tamil === 'string') as Sentence[] : [];
    } catch { return []; }
  }

  private writeCache(value: Sentence[]): void { storageSet(CACHE_KEY, JSON.stringify(value)); }
}
