import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LelaConversationService, type SavedConversation } from './lela-conversation.service';
import { DataService } from '../core/data.service';
import { OnlineSentenceLibraryService } from '../core/online-sentence-library.service';
import { StorageService } from '../core/storage.service';
import { IconComponent } from '../shared/icon.component';
import type { Word } from '../models/learning.models';
import type { LelaMessage } from './lela.models';
import type { GrammarLesson } from '../models/learning.models';
import { LELA_CORRECTOR } from './lela-corrector';
import { PREPOSITION_LESSONS, mergeExtraPrepositions, type PrepLesson, type PrepQuestion } from './preposition-data';
import { TENSE_LESSONS, type TenseId, type TenseTamilItem } from './tense-data';
import {
  allPrepositionQuestions, checkPrepositionAnswer, checkTenseEnglish, checkTenseTamil, parseTenseModeChoice, prepositionLessonMessages,
  prepositionQuestionMessage, tenseEnglishPromptMessage, tenseLessonMessages, tenseTamilPromptMessage,
  type MessageSpec,
} from './practice-engine';
import { feedbackLines, buildFeedback } from './grammar-feedback';
import { BLANK_CATEGORY_LABEL, buildBlankBank, isBlankAnswerCorrect, type BlankQuestion } from './fill-blank-data';
import { PARAGRAPH_DATA_URL, PARAGRAPH_LEVELS, sanitiseParagraphs, type ParagraphItem, type ParagraphLevel } from './paragraph-data';
import { evaluateSegments, segmentAnswer, type ParagraphResult } from './paragraph-checker';
import { checkTranslation } from './sentence-checker';
import { buildTensePracticePools, buildTranslationPracticePools, type SentenceCategorySource } from './practice-sentence-library';
import { lineFor, type CorrectionCard } from './correction-card';

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

interface PrepItem { id: string; word: string; tamil: string; example: string; exampleTamil: string; group: string; level: string; }
interface TranslationItem { ta: string; answers: string[]; note: string; }
interface TenseItem { id: string; name: string; formula: string; en: string; ta: string; answer: string; explanation: string; }

type PracticeKind = 'chat' | 'tamil' | 'tenses' | 'preposition' | 'fillBlank';
type HeaderMode = 'auto' | 'manual' | 'text' | 'voice';

/** The Voice and Auto buttons are the hands-free Voice Session. Manual and Text are normal chat with a manual (or no) microphone. */
const isVoiceSession = (m: HeaderMode): boolean => m === 'voice' || m === 'auto';

/** One bubble in a practice exercise (Tamil → English, 12 Tenses, Prepositions). */
interface PracticeMessage {
  id: number;
  from: 'lela' | 'user';
  text: string;
  /** Plain Tamil line (for example the Tamil meaning that goes with a question). */
  tamil?: string;
  boxLabel?: string;
  box?: string;
  boxOk?: boolean;
  notes?: string[];
  tamilExplain?: string;
  speak?: string;
  fix?: CorrectionCard;
}

/** What the template draws. Chat messages and practice messages are both turned into this one shape. */
interface ViewMessage {
  key: string;
  from: 'lela' | 'user';
  text: string;
  tamil?: string;
  boxLabel?: string;
  box?: string;
  boxOk?: boolean;
  notes: string[];
  tamilExplain?: string;
  fix?: CorrectionCard;
  /** What the speaker button reads aloud. */
  speak: string;
  /** Set only for real chat messages, so the heart can save them as favourites. */
  source?: LelaMessage;
}

// ---------------------------------------------------------------------------------------------
// Practice data
// ---------------------------------------------------------------------------------------------

const TENSES: TenseItem[] = [
  { id: 'present-simple', name: 'Present Simple', formula: 'Subject + base verb (s/es)', en: 'I practise English every day.', ta: 'நான் தினமும் ஆங்கிலம் பயிற்சி செய்கிறேன்.', answer: 'I practise English every day.', explanation: 'Daily habits and routines — வழக்கமாக நடக்கும் செயல்கள்.' },
  { id: 'present-continuous', name: 'Present Continuous', formula: 'Subject + am/is/are + verb-ing', en: 'I am learning new words now.', ta: 'நான் இப்போது புதிய சொற்களைக் கற்றுக்கொண்டிருக்கிறேன்.', answer: 'I am learning new words now.', explanation: 'An action happening now — இப்போது நடந்து கொண்டிருக்கும் செயல்.' },
  { id: 'present-perfect', name: 'Present Perfect', formula: 'Subject + has/have + past participle', en: 'I have finished my work.', ta: 'நான் என் வேலையை முடித்துவிட்டேன்.', answer: 'I have finished my work.', explanation: 'A completed action connected to the present — நிகழ்காலத்துடன் தொடர்புள்ள முடிந்த செயல்.' },
  { id: 'present-perfect-continuous', name: 'Present Perfect Continuous', formula: 'Subject + has/have been + verb-ing', en: 'I have been studying for two hours.', ta: 'நான் இரண்டு மணி நேரமாகப் படித்துக்கொண்டிருக்கிறேன்.', answer: 'I have been studying for two hours.', explanation: 'An action that started earlier and continues — முன்பு தொடங்கி இப்போதும் தொடரும் செயல்.' },
  { id: 'past-simple', name: 'Past Simple', formula: 'Subject + past verb', en: 'I visited my friend yesterday.', ta: 'நான் நேற்று என் நண்பரைச் சந்தித்தேன்.', answer: 'I visited my friend yesterday.', explanation: 'A finished action in the past — கடந்த காலத்தில் முடிந்த செயல்.' },
  { id: 'past-continuous', name: 'Past Continuous', formula: 'Subject + was/were + verb-ing', en: 'I was watching television at eight.', ta: 'எட்டு மணிக்கு நான் தொலைக்காட்சி பார்த்துக்கொண்டிருந்தேன்.', answer: 'I was watching television at eight.', explanation: 'An action in progress at a past time — கடந்த நேரத்தில் நடந்துகொண்டிருந்த செயல்.' },
  { id: 'past-perfect', name: 'Past Perfect', formula: 'Subject + had + past participle', en: 'I had eaten before he arrived.', ta: 'அவர் வருவதற்கு முன்பே நான் சாப்பிட்டிருந்தேன்.', answer: 'I had eaten before he arrived.', explanation: 'An earlier past action before another past action — மற்றொரு கடந்தகாலச் செயலுக்கு முன் முடிந்த செயல்.' },
  { id: 'past-perfect-continuous', name: 'Past Perfect Continuous', formula: 'Subject + had been + verb-ing', en: 'I had been waiting for an hour.', ta: 'நான் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருந்தேன்.', answer: 'I had been waiting for an hour.', explanation: 'Duration before a point in the past — கடந்தகாலத்தில் ஒரு நேரத்திற்கு முன்புவரை தொடர்ந்த செயல்.' },
  { id: 'future-simple', name: 'Future Simple', formula: 'Subject + will + base verb', en: 'I will call you tomorrow.', ta: 'நான் நாளை உங்களை அழைப்பேன்.', answer: 'I will call you tomorrow.', explanation: 'A future action or decision — எதிர்காலத்தில் நடக்கும் செயல்.' },
  { id: 'future-continuous', name: 'Future Continuous', formula: 'Subject + will be + verb-ing', en: 'I will be working at ten.', ta: 'பத்து மணிக்கு நான் வேலை செய்துகொண்டிருப்பேன்.', answer: 'I will be working at ten.', explanation: 'An action in progress at a future time — எதிர்கால நேரத்தில் நடந்துகொண்டிருக்கும் செயல்.' },
  { id: 'future-perfect', name: 'Future Perfect', formula: 'Subject + will have + past participle', en: 'I will have completed it by Monday.', ta: 'திங்கட்கிழமைக்குள் அதை முடித்திருப்பேன்.', answer: 'I will have completed it by Monday.', explanation: 'An action completed before a future time — எதிர்கால நேரத்திற்கு முன் முடிந்திருக்கும் செயல்.' },
  { id: 'future-perfect-continuous', name: 'Future Perfect Continuous', formula: 'Subject + will have been + verb-ing', en: 'By June, I will have been working here for a year.', ta: 'ஜூன் மாதத்திற்குள் நான் இங்கு ஒரு வருடமாக வேலை செய்துகொண்டிருப்பேன்.', answer: 'By June, I will have been working here for a year.', explanation: 'Duration continuing up to a future point — எதிர்கால நேரம் வரை தொடர்ந்திருக்கும் செயல்.' },
];

const TRANSLATIONS_RAW: Record<string, TranslationItem[]> = {
  'Daily life': [
    { ta: 'நான் தினமும் காலை ஆறு மணிக்கு எழுந்திருப்பேன்.', answers: ['i wake up at six every morning', 'i get up at six every day'], note: 'Use the simple present for daily habits.' },
    { ta: 'இன்று எனக்கு கொஞ்சம் வேலை இருக்கிறது.', answers: ['i have some work today', 'i have a little work today'], note: '“I have…” describes something you need to do.' },
    { ta: 'நான் இப்போது சமைத்துக்கொண்டிருக்கிறேன்.', answers: ['i am cooking now', 'i am cooking right now'], note: 'Use am/is/are + verb-ing for an action happening now.' },
    { ta: 'நான் நேற்று சந்தைக்குச் சென்றேன்.', answers: ['i went to the market yesterday', 'i went to market yesterday'], note: 'Use the past form “went” for yesterday.' },
    { ta: 'நாளை உங்களைச் சந்திப்பேன்.', answers: ['i will meet you tomorrow', 'i will see you tomorrow'], note: 'Use will for a future action.' },
  ],
  'Shopping': [
    { ta: 'இந்த சட்டையின் விலை எவ்வளவு?', answers: ['how much is this shirt', 'what is the price of this shirt'], note: 'Use “How much is…?” to ask the price.' },
    { ta: 'எனக்கு ஒரு நீல நிற சட்டை வேண்டும்.', answers: ['i want a blue shirt', 'i would like a blue shirt'], note: '“I would like” is a polite way to say what you want.' },
    { ta: 'வேறு நிறங்கள் இருக்கிறதா?', answers: ['do you have other colours', 'are there any other colours', 'do you have other colors'], note: 'Use “Do you have…?” to ask what is available.' },
    { ta: 'நான் இதை முயற்சி செய்து பார்க்கலாமா?', answers: ['can i try this on', 'may i try this on'], note: '“Try this on” means wear it to check the fit.' },
    { ta: 'கொஞ்சம் குறைக்க முடியுமா?', answers: ['can you reduce the price a little', 'could you give me a discount'], note: '“Could you…?” makes a polite request.' },
  ],
  'Friends & Family': [
    { ta: 'நீ இன்று மாலை என்ன செய்கிறாய்?', answers: ['what are you doing this evening', 'what are you doing tonight'], note: 'Use present continuous for a planned activity.' },
    { ta: 'நாம் ஒன்றாக தேநீர் குடிக்கலாமா?', answers: ['shall we have tea together', 'can we have tea together'], note: '“Shall we…?” makes a friendly suggestion.' },
    { ta: 'உனக்கு இன்று எப்படி இருக்கிறது?', answers: ['how are you feeling today', 'how do you feel today'], note: 'Use “How are you feeling?” to ask about someone.' },
  ],
  'Workplace': [
    { ta: 'நான் இந்த வேலையை நாளைக்குள் முடித்துவிடுவேன்.', answers: ['i will finish this work by tomorrow', 'i will complete this task by tomorrow'], note: 'Use “will” for a future promise.' },
    { ta: 'தயவுசெய்து அந்த கோப்பை எனக்கு அனுப்புங்கள்.', answers: ['please send me that file', 'could you please send me that file'], note: '“Could you please…?” is polite at work.' },
    { ta: 'நான் ஏழு வருட அனுபவம் பெற்றுள்ளேன்.', answers: ['i have seven years of experience', 'i have seven years experience'], note: 'Use “I have … years of experience”.' },
  ],
  'Travel': [
    { ta: 'பேருந்து நிலையம் எங்கே இருக்கிறது?', answers: ['where is the bus station', 'where is the bus stand'], note: 'Use “Where is…?” to ask for a place.' },
    { ta: 'இந்த ரயில் சென்னைக்குச் செல்கிறதா?', answers: ['does this train go to chennai', 'is this train going to chennai'], note: 'Use “Does this…?” for a simple present question.' },
  ],
  'Restaurant': [
    { ta: 'இரண்டு பேருக்கு ஒரு மேசை வேண்டும்.', answers: ['i need a table for two', 'i would like a table for two'], note: 'Use “a table for two” when asking for seating.' },
    { ta: 'உங்களிடம் சைவ உணவு இருக்கிறதா?', answers: ['do you have vegetarian food', 'do you have any vegetarian dishes'], note: '“Do you have…?” asks about availability.' },
    { ta: 'கணக்கைக் கொடுக்க முடியுமா?', answers: ['can i have the bill', 'could i have the bill please'], note: '“Could I have the bill?” is polite.' },
  ],
  'Job Interview': [
    { ta: 'எனக்கு ஏழு வருட தொழில்நுட்ப ஆதரவு அனுபவம் உள்ளது.', answers: ['i have seven years of technical support experience', 'i have seven years experience in technical support'], note: 'Use “I have … years of experience” to describe your background.' },
    { ta: 'நான் புதிய தொழில்நுட்பங்களை கற்றுக்கொள்ள விரும்புகிறேன்.', answers: ['i want to learn new technologies', 'i would like to learn new technologies'], note: '“Would like to” sounds professional and polite.' },
  ],
  'Telephone': [
    { ta: 'நான் ரவியுடன் பேசலாமா?', answers: ['may i speak to ravi', 'can i speak to ravi'], note: 'Use “May I speak to…?” on a formal call.' },
    { ta: 'தயவுசெய்து அவரை அழைக்கச் சொல்லுங்கள்.', answers: ['please ask him to call me', 'could you ask him to call me'], note: '“Ask him to call me” is a polite request.' },
  ],
  'Hotel': [
    { ta: 'எனக்கு ஒரு அறை முன்பதிவு செய்ய வேண்டும்.', answers: ['i want to book a room', 'i would like to book a room'], note: 'Use “book a room” for a hotel reservation.' },
    { ta: 'ஒரு இரவுக்கு எவ்வளவு?', answers: ['how much is it for one night', 'how much does it cost for one night'], note: 'Use “How much…?” to ask about the cost.' },
  ],
  'Everyday Practice – Extra': [
    { ta: 'காலையில் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ஒரு டம்ளர் தண்ணீர் குடிக்கிறேன்', answers: ['i drink a glass of water whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் காலை உணவைத் தயாரிக்கிறேன்', answers: ['i prepare breakfast whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் அறையைச் சுத்தம் செய்கிறேன்', answers: ['i clean my room whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் புத்தகங்களை ஒழுங்குபடுத்துகிறேன்', answers: ['i arrange my books whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் கைபேசிக்கு சார்ஜ் செய்கிறேன்', answers: ['i charge my phone whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் வானிலையைப் பார்க்கிறேன்', answers: ['i check the weather whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் திட்டங்களை எழுதுகிறேன்', answers: ['i write my plans whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் செய்திகளைப் படிக்கிறேன்', answers: ['i read the news whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் செடிகளுக்குத் தண்ணீர் ஊற்றுகிறேன்', answers: ['i water the plants whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் பாத்திரங்களைக் கழுவுகிறேன்', answers: ['i wash the dishes whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் அம்மாவுக்கு உதவுகிறேன்', answers: ['i help my mother whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் சகோதரனை அழைக்கிறேன்', answers: ['i call my brother whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் அப்பாவுடன் பேசுகிறேன்', answers: ['i speak with my father whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் தாத்தா பாட்டியைப் பார்க்கச் செல்கிறேன்', answers: ['i visit my grandparents whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் குழந்தைகளுடன் விளையாடுகிறேன்', answers: ['i play with the children whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் இசை கேட்கிறேன்', answers: ['i listen to music in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் இசை கேட்கிறேன்', answers: ['i listen to music in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் இசை கேட்கிறேன்', answers: ['i listen to music after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் இசை கேட்கிறேன்', answers: ['i listen to music before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் இசை கேட்கிறேன்', answers: ['i listen to music after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் இசை கேட்கிறேன்', answers: ['i listen to music when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் இசை கேட்கிறேன்', answers: ['i listen to music with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் இசை கேட்கிறேன்', answers: ['i listen to music at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் இசை கேட்கிறேன்', answers: ['i listen to music every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் இசை கேட்கிறேன்', answers: ['i listen to music whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் பயனுள்ள காணொளியைப் பார்க்கிறேன்', answers: ['i watch a useful video whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ஆங்கிலம் பயிற்சி செய்கிறேன்', answers: ['i practise english whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ஒரு புதிய சொல்லைக் கற்றுக்கொள்கிறேன்', answers: ['i learn a new word whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் அந்த வாக்கியத்தை மீண்டும் சொல்கிறேன்', answers: ['i repeat the sentence whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் வேலையைத் தொடங்குகிறேன்', answers: ['i start my work whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் அறிக்கையை முடிக்கிறேன்', answers: ['i finish the report whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் விவரங்களைச் சரிபார்க்கிறேன்', answers: ['i check the details whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் செய்தியை அனுப்புகிறேன்', answers: ['i send the message whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் கூட்டத்தில் கலந்துகொள்கிறேன்', answers: ['i attend the meeting whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ஒரு கேள்வி கேட்கிறேன்', answers: ['i ask a question whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் பிரச்சினையை விளக்குகிறேன்', answers: ['i explain the problem whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் கருத்தைப் பகிர்கிறேன்', answers: ['i share my opinion whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் முக்கியமான குறிப்புகளை எழுதிக்கொள்கிறேன்', answers: ['i note the important points whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் கொடுத்த வாக்கைக் காப்பாற்றுகிறேன்', answers: ['i keep my promise whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் புதிய காய்கறிகளை வாங்குகிறேன்', answers: ['i buy fresh vegetables whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் விலைகளை ஒப்பிட்டுப் பார்க்கிறேன்', answers: ['i compare the prices whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ரசீதைச் சரிபார்க்கிறேன்', answers: ['i check the bill whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் மீதிப் பணத்தை வைத்துக்கொள்கிறேன்', answers: ['i keep the change whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் ஒரு கடைப்பையை எடுத்துச் செல்கிறேன்', answers: ['i carry a shopping bag whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் பேருந்துக்காகக் காத்திருக்கிறேன்', answers: ['i wait for the bus whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் பயணச்சீட்டுகளை முன்பதிவு செய்கிறேன்', answers: ['i book the tickets whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் செல்லும் வழியைச் சரிபார்க்கிறேன்', answers: ['i check the route whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் துணிகளைப் பொதி செய்கிறேன்', answers: ['i pack my clothes whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் ஆவணங்களைப் பாதுகாப்பாக வைத்திருக்கிறேன்', answers: ['i keep my documents safely whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் புதிய பழங்களைச் சாப்பிடுகிறேன்', answers: ['i eat fresh fruit whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் சிறிது நேரம் நடக்கிறேன்', answers: ['i take a short walk whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் போதுமான நேரம் தூங்குகிறேன்', answers: ['i get enough sleep whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் சிறிது நேரம் ஓய்வு எடுக்கிறேன்', answers: ['i take a short break whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் சுற்றுப்புறத்தைச் சுத்தமாக வைத்திருக்கிறேன்', answers: ['i keep my surroundings clean whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் கொஞ்சம் பணத்தைச் சேமிக்கிறேன்', answers: ['i save some money whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் என் செலவுகளைத் திட்டமிடுகிறேன்', answers: ['i plan my expenses whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் சாவிகளை ஒரே இடத்தில் வைக்கிறேன்', answers: ['i keep the keys in one place whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் விளக்குகளை அணைக்கிறேன்', answers: ['i switch off the lights whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலையில் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door in the morning'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மாலையில் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door in the evening'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'காலை உணவுக்குப் பிறகு நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door after breakfast'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'மதிய உணவுக்கு முன்பு நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door before lunch'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வேலைக்குப் பிறகு நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door after work'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு ஓய்வு நேரம் கிடைக்கும்போது நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door when i have free time'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'என் குடும்பத்தினருடன் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door with my family'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'வீட்டில் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door at home'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'தினமும் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door every day'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
    { ta: 'எனக்கு வாய்ப்பு கிடைக்கும் போதெல்லாம் நான் கதவைப் பூட்டுகிறேன்', answers: ['i lock the door whenever i get a chance'], note: 'Use the simple present to describe a routine or regular action. Add the time or situation phrase at the end.' },
  ],
};

// ---------------------------------------------------------------------------------------------
// Small helpers (module level, so no member can be declared twice)
// ---------------------------------------------------------------------------------------------

/** Lower-case, strip punctuation and extra spaces. Tamil vowel signs (\p{M}) are kept. */
function norm(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function shuffle<T>(items: readonly T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Dice coefficient on letter pairs: 1 = same, 0 = nothing in common. Used to accept near-identical Tamil answers. */
function similarity(a: string, b: string): number {
  const pairs = (s: string): string[] => {
    const t = s.replace(/\s/g, '');
    const out: string[] = [];
    for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
    return out;
  };
  const x = pairs(a);
  const y = pairs(b);
  if (!x.length || !y.length) return a === b ? 1 : 0;
  const counts = new Map<string, number>();
  for (const g of x) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of y) {
    const left = counts.get(g) ?? 0;
    if (left > 0) { hits++; counts.set(g, left - 1); }
  }
  return (2 * hits) / (x.length + y.length);
}

/** "i went to chennai" → "I went to Chennai." (the stored answers are lower-case and have no punctuation). */
function pretty(answer: string): string {
  let s = answer.trim().replace(/\bi\b/g, 'I').replace(/\bchennai\b/g, 'Chennai').replace(/\bravi\b/g, 'Ravi');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (/[.?!]$/.test(s)) return s;
  return /^(how|what|where|when|who|why|do|does|did|is|are|can|could|may|shall|will|would)\b/i.test(s) ? `${s}?` : `${s}.`;
}

/** Removes repeated sentences: the same Tamil sentence is kept once, even if it sits in two topics. */
function dedupeTranslations(raw: Record<string, TranslationItem[]>): Record<string, TranslationItem[]> {
  const seen = new Set<string>();
  const out: Record<string, TranslationItem[]> = {};
  for (const [topic, items] of Object.entries(raw)) {
    out[topic] = items.filter((item) => {
      const key = norm(item.ta);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return out;
}

const TRANSLATIONS = dedupeTranslations(TRANSLATIONS_RAW);
const CORRECT_TAMIL = 'உங்கள் வாக்கியம் சரியாக உள்ளது.';

// ---------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------

@Component({
  selector: 'app-lela',
  standalone: true,
  imports: [IconComponent, DecimalPipe],
  template: `
    <div class="lela-shell">
      <!-- ===== Header ===== -->
      <header class="topbar">
        <button class="menu-btn" type="button" aria-label="Menu" [attr.aria-expanded]="menuOpen()" (click)="toggleMenu()"><app-icon name="menu" [size]="26" /></button>
        <img class="avatar" src="/images/leela.png" alt="Lela" [class.talking]="lela.phase() === 'speaking'" />
        <div class="identity">
          <b>Lela</b>
          <small><i class="dot" [class.off]="!online()"></i>{{ online() ? 'Online' : 'Offline' }} · {{ statusText() }}</small>
        </div>
        <div class="head-modes" role="group" aria-label="Conversation mode">
          <button type="button" [class.active]="headerMode() === 'auto'" (click)="setHeaderMode('auto')">Auto</button>
          <button type="button" [class.active]="headerMode() === 'manual'" (click)="setHeaderMode('manual')">Manual</button>
          <button type="button" [class.active]="headerMode() === 'text'" (click)="setHeaderMode('text')">Text</button>
          <button type="button" [class.active]="headerMode() === 'voice'" (click)="setHeaderMode('voice')">Voice</button>
          @if (hasPracticeMenu()) {
            <button type="button" class="practice-toggle" [class.open]="practiceMenuOpen()" [attr.aria-expanded]="practiceMenuOpen()" aria-haspopup="true" (click)="togglePracticeMenu()">Practice {{ practiceMenuOpen() ? '▴' : '▾' }}</button>
          }
        </div>
      </header>

      @if (menuOpen()) {
        <div class="menu-panel" role="menu">
          <button type="button" role="menuitem" (click)="goHome()"><app-icon name="home" [size]="18" /> Home</button>
          <button type="button" role="menuitem" (click)="openPanel('history')"><app-icon name="history" [size]="18" /> Conversation history</button>
          <button type="button" role="menuitem" (click)="openPanel('fav')"><app-icon name="heart" [size]="18" /> Favourites</button>
          <button type="button" role="menuitem" (click)="openDictionary()"><app-icon name="book" [size]="18" /> My Dictionary</button>
          <button type="button" role="menuitem" (click)="startPrepositions()"><app-icon name="text" [size]="18" /> Preposition practice</button>
          <button type="button" role="menuitem" (click)="openPanel('settings')"><app-icon name="settings" [size]="18" /> Voice settings</button>
          <button type="button" role="menuitem" (click)="openPanel('info')"><app-icon name="info" [size]="18" /> How Lela works</button>
        </div>
      }

      @if (panel() === 'settings') {
        <div class="overlay-panel settings-panel">
          <div class="panel-title">Voice settings <button type="button" aria-label="Close" (click)="panel.set(null)">×</button></div>
          <label><input type="checkbox" [checked]="lela.voiceOn()" (change)="lela.setVoiceOn(checked($event))" /> Lela voice</label>
          <label><input type="checkbox" [checked]="lela.micOn()" (change)="lela.setMicOn(checked($event))" /> Microphone enabled</label>
          <label><input type="checkbox" [checked]="lela.showTamil()" (change)="lela.setShowTamil(checked($event))" /> Show Tamil meaning</label>
          <label>Voice
            <select (change)="lela.setVoiceName(valueOf($event))">
              <option value="">Automatic</option>
              @for (v of lela.englishVoices(); track v.name) { <option [value]="v.name" [selected]="v.name === lela.voiceName()">{{ v.name }} ({{ v.lang }})</option> }
            </select>
          </label>
          <label>Speed <input type="range" min="0.5" max="1.3" step="0.05" [value]="lela.rate()" (input)="lela.setRate(numberValue($event))" /></label>
          <label>Pitch <input type="range" min="0.6" max="1.6" step="0.05" [value]="lela.pitch()" (input)="lela.setPitch(numberValue($event))" /></label>
          <label>Volume <input type="range" min="0" max="1" step="0.05" [value]="lela.volume()" (input)="lela.setVolume(numberValue($event))" /></label>
          <button type="button" class="solid" (click)="lela.previewVoice()">Test voice</button>
        </div>
      }
      @if (panel() === 'history') {
        <div class="overlay-panel">
          <div class="panel-title">Conversation history <button type="button" aria-label="Close" (click)="panel.set(null)">×</button></div>
          @for (h of lela.history(); track h.id) { <button type="button" class="history-row" (click)="openHistory(h)">{{ dateLabel(h) }} · {{ h.messages.length }} messages</button> }
          @if (!lela.history().length) { <p>No saved conversations yet.</p> }
        </div>
      }
      @if (panel() === 'fav') {
        <div class="overlay-panel">
          <div class="panel-title">Favourites <button type="button" aria-label="Close" (click)="panel.set(null)">×</button></div>
          @for (f of lela.favourites(); track f.id) { <p><b>{{ f.from === 'lela' ? 'Lela' : 'You' }}:</b> {{ f.text }} <button type="button" class="play-mini" aria-label="Listen" (click)="lela.playSample(f.corrected ?? f.text)"><app-icon name="volume" [size]="16" /></button></p> }
          @if (!lela.favourites().length) { <p>Tap the heart on a message to save it here.</p> }
        </div>
      }
      @if (panel() === 'info') {
        <div class="overlay-panel">
          <div class="panel-title">How Lela works <button type="button" aria-label="Close" (click)="panel.set(null)">×</button></div>
          <p>Lela uses your saved lessons and conversation data. Voice recognition depends on your device and microphone permission. Corrections use the app's grammar rules (rule-based, not AI), so they cover common mistakes only.</p>
        </div>
      }
      @if (viewing(); as saved) {
        <div class="overlay-panel">
          <div class="panel-title">Saved conversation <button type="button" aria-label="Close" (click)="viewing.set(null)">×</button></div>
          @for (m of saved.messages; track m.id) { <p><b>{{ m.from === 'lela' ? 'Lela' : 'You' }}:</b> {{ m.text }}</p> }
        </div>
      }

      <!-- ===== Conversation ===== -->
      <main class="conversation" #scrollBox aria-label="Lela conversation" aria-live="polite" [hidden]="paragraphOpen()">
        @for (m of view(); track m.key) {
          <div class="row" [class.from-user]="m.from === 'user'">
            @if (m.from === 'lela') { <img class="mini-avatar" src="/images/leela.png" alt="" /> }
            <div class="bubble" [class.user-bubble]="m.from === 'user'">
              <b class="who">{{ m.from === 'lela' ? 'Lela' : 'You' }}</b>
              <p class="text">{{ m.text }}</p>
              @if (m.tamil) { <p class="tamil" lang="ta">{{ m.tamil }}</p> }
              @if (m.fix; as f) {
                <div class="fix" [class.ok]="f.ok">
                  <p><b>You {{ f.label }}:</b> {{ f.said }}</p>
                  @if (f.ok) { <p class="fix-ok"><b>Correct! Excellent.</b></p> }
                  @else {
                    <p><b>Mistakes:</b></p>
                    <ul>@for (x of f.mistakes; track x) { <li>{{ x }}</li> }</ul>
                    <p><b>Correct sentence:</b> {{ f.corrected }}</p>
                  }
                  @if (f.tense) { <p><b>Tense:</b> {{ f.tense }}</p> }
                </div>
              }
              @if (m.box) {
                <p class="box-label" [class.wrong]="m.boxOk === false"><app-icon [name]="m.boxOk === false ? 'info' : 'corrected'" [size]="22" /> {{ m.boxLabel }}</p>
                <p class="box" [class.wrong]="m.boxOk === false">{{ m.box }}</p>
              }
              @for (n of m.notes; track n) { <p class="note">{{ n }}</p> }
              @if (m.tamilExplain) {
                <p class="tamil-label"><app-icon name="translate" [size]="22" /> தமிழ் விளக்கம்:</p>
                <p class="tamil-text" lang="ta">{{ m.tamilExplain }}</p>
              }
              @if (m.from === 'lela') {
                <div class="actions">
                  <button type="button" aria-label="Listen" title="Listen" (click)="lela.playSample(m.speak)"><app-icon name="volume" [size]="20" /></button>
                  @if (m.box) { <button type="button" aria-label="Practise this sentence" title="Practise this sentence" (click)="practiseSentence(m.box)"><app-icon name="replay" [size]="20" /></button> }
                  @if (m.fix && !m.box) { <button type="button" aria-label="Practise this sentence" title="Practise this sentence" (click)="practiseSentence(m.fix.corrected)"><app-icon name="replay" [size]="20" /></button> }
                  @if (m.source; as src) {
                    <button type="button" aria-label="Save favourite" title="Save favourite" [class.saved]="lela.isFavourite(src)" (click)="lela.toggleFavourite(src)"><app-icon [name]="lela.isFavourite(src) ? 'heart-fill' : 'heart'" [size]="20" /></button>
                  }
                </div>
              }
            </div>
            @if (m.from === 'user') { <span class="user-avatar" aria-hidden="true"><app-icon name="user" [size]="26" /></span> }
          </div>
        }
        @if (loadingPractice()) { <div class="status-line">Loading your practice questions…</div> }
        @if (lela.phase() === 'thinking' && practiceMode() === 'chat') { <div class="status-line">Lela is thinking…</div> }
        @if (lela.error(); as err) { <div class="error-message" role="alert">{{ err }}</div> }
        @if (practiceMode() !== 'chat' && practiceMode() !== 'fillBlank') { <div class="status-line">{{ practiceTitle() }}</div> }
      </main>

      @if (practiceMode() === 'tamil') {
        <div class="mode-options practice-dropdown" [hidden]="!practiceMenuOpen()" role="group" aria-label="Tamil to English practice type">
          <button type="button" class="seg" [class.on]="tamilKind() === 'sentence'" [attr.aria-pressed]="tamilKind() === 'sentence'" (click)="setTamilKind('sentence')">Sentence Practice</button>
          <button type="button" class="seg" [class.on]="tamilKind() === 'paragraph'" [attr.aria-pressed]="tamilKind() === 'paragraph'" (click)="setTamilKind('paragraph')">Paragraph Practice</button>
          @if (tamilKind() === 'sentence') {
            <label>Topic
              <select [value]="translationTopic()" (change)="startTamil(valueOf($event)); closePracticeMenu()">
                @for (t of translationTopics; track t) { <option [value]="t">{{ t }} ({{ translationPools()[t]?.length ?? 0 }})</option> }
              </select>
            </label>
            <button type="button" class="seg" (click)="fetchFreeOnlineSentences()" [disabled]="onlineSentenceLoading() || !online()">
              {{ onlineSentenceLoading() ? 'Fetching…' : '＋ Get free new sentences' }}
            </button>
            @if (onlineSentenceStatus()) { <span class="tense-count" role="status">{{ onlineSentenceStatus() }}</span> }
          } @else {
            <label>Difficulty
              <select [value]="paragraphLevel()" (change)="setParagraphLevel(valueOf($event))">
                @for (l of paragraphLevels; track l) { <option [value]="l">{{ l }}</option> }
              </select>
            </label>
          }
        </div>
      }
      @if (paragraphOpen()) {
        <section class="conversation para-panel" aria-label="Paragraph practice">
          <div class="status-line">Paragraph Practice · {{ paragraphLevel() }} · Paragraph {{ paraList().length ? paraPos() + 1 : 0 }} / {{ paraList().length }}</div>
          @if (paragraphsLoading()) { <div class="status-line">Loading paragraphs…</div> }
          @if (paragraphError(); as perr) { <div class="error-message" role="alert">{{ perr }}</div> }
          @if (currentParagraph(); as p) {
            <div class="para-card">
              <b class="who">{{ p.topic }} · {{ p.sentenceCount }} sentences</b>
              <p class="tamil para-tamil" lang="ta">{{ p.tamil }}</p>
            </div>
            <label class="para-label" for="paraAnswer">Your English translation</label>
            <textarea id="paraAnswer" class="para-answer" rows="6" [value]="paraAnswer()" (input)="paraAnswer.set(textValue($event))" [disabled]="!!paraResult()" placeholder="Type or say your English translation of the whole paragraph…"></textarea>
            @if (paraListening()) { <div class="listening">● Listening… {{ paraInterim() }}</div> }
            <div class="para-buttons">
              <button type="button" class="control speak" (click)="paragraphMic()" [disabled]="!lela.speech.recognitionSupported || !!paraResult() || paraListening()"><app-icon name="mic" [size]="19" /><span class="lbl">Speak</span></button>
              <button type="button" class="control stop" (click)="stopParagraphMic()"><app-icon name="stop" [size]="17" /><span class="lbl">Stop</span></button>
              <button type="button" class="control send para-submit" (click)="submitParagraph()" [disabled]="!paraAnswer().trim() || !!paraResult() || paraChecking()">{{ paraChecking() ? 'Checking…' : 'Submit' }}</button>
              <button type="button" class="control" (click)="clearParagraph()">Clear</button>
              <button type="button" class="control" (click)="nextParagraph()">Next</button>
            </div>
            @if (paraResult(); as r) {
              <div class="para-results" aria-live="polite">
                <p class="results-line"><b>Results</b> · Total sentences: {{ r.total }} · Correct: {{ r.correct }} · Incorrect: {{ r.incorrect }} · Total mistakes: {{ r.mistakeCount }} · Score: {{ r.score }}%</p>
                @for (sr of r.sentences; track sr.index) {
                  <div class="fix para-sentence" [class.ok]="sr.ok">
                    <p class="tamil" lang="ta"><b>{{ sr.index + 1 }}.</b> {{ sr.tamil }}</p>
                    <p><b>You {{ paraLabel() }}:</b> {{ sr.userText || '(nothing written for this sentence)' }}</p>
                    @if (sr.ok) { <p class="fix-ok"><b>Correct! Excellent.</b></p> }
                    @else {
                      <p><b>Mistakes:</b></p>
                      <ul>@for (x of sr.mistakeLines; track x) { <li>{{ x }}</li> }</ul>
                      <p><b>Correct sentence:</b> {{ sr.corrected }}</p>
                    }
                  </div>
                }
                @if (paraTotals(); as t) {
                  <p class="results-line session">Session so far · Paragraphs: {{ t.paragraphs }} · Sentences: {{ t.total }} · Correct: {{ t.correct }} · Incorrect: {{ t.total - t.correct }} · Mistakes: {{ t.mistakes }} · Score: {{ t.total ? (t.correct * 100 / t.total | number:'1.0-0') : 0 }}%</p>
                }
              </div>
            }
          } @else if (!paragraphsLoading() && !paragraphError()) {
            <p class="status-line">No paragraphs for this level.</p>
          }
        </section>
      }
      @if (practiceMode() === 'tenses') {
        <div class="mode-options practice-dropdown" [hidden]="!practiceMenuOpen()">
          <label>Tense
            <select [value]="selectedTense()" (change)="selectTense(valueOf($event))">
              @for (t of tenses; track t.id) { <option [value]="t.id">{{ t.name }}</option> }
            </select>
          </label>
          <span class="tense-count">{{ selectedTenseTamilCount() }} Tamil → English sentences</span>
          <button type="button" class="seg" (click)="fetchFreeOnlineTenseSentences()" [disabled]="onlineSentenceLoading() || !online()">
            {{ onlineSentenceLoading() ? 'Fetching…' : '＋ Get free tense examples' }}
          </button>
          @if (onlineSentenceStatus()) { <span class="tense-count" role="status">{{ onlineSentenceStatus() }}</span> }
          @if (tenseMode() === 'ask' && tenseLessonShown()) {
            <div class="prep-examples">
              <p>How would you like to practise?</p>
              <div class="prep-choice">
                <button type="button" (click)="chooseTenseMode('english'); closePracticeMenu()">English Practice</button>
                <button type="button" (click)="chooseTenseMode('tamil'); closePracticeMenu()">Tamil to English Practice</button>
                <button type="button" (click)="chooseFillBlankPractice(); closePracticeMenu()"><app-icon name="edit" [size]="17" /> Fill in the Blank</button>
              </div>
            </div>
          }
          <details class="tense-wordbank">
            <summary>Practice word bank ({{ tenseWords().length }} words)</summary>
            <input placeholder="Search English or Tamil word" aria-label="Search word bank" [value]="tenseWordSearch()" (input)="tenseWordSearch.set(inputValue($event))" />
            <div class="wordbank-list">
              @for (w of filteredTenseWords(); track w.id) { <span><b>{{ w.word }}</b> — {{ w.tamil }}</span> }
            </div>
          </details>
        </div>
      }
      @if (practiceMode() === 'preposition') {
        <div class="mode-options prep-options practice-dropdown" [hidden]="!practiceMenuOpen()">
          <label>Choose a preposition
            <select [value]="selectedPreposition()" (change)="selectPreposition(valueOf($event))">
              <option value="">Select preposition…</option>
              @for (word of prepositionWords(); track word) { <option [value]="word">{{ word }}</option> }
            </select>
          </label>
        </div>
      }
      @if (practiceMode() === 'tamil' && tamilKind() === 'sentence') {
        <div class="mode-options practice-navigation compact-nav" aria-label="Tamil practice navigation">
          <button type="button" class="nav-arrow" aria-label="Previous question" (click)="previousTamilQuestion()" [disabled]="tamilPos <= 0">‹</button>
          <span>Question {{ tamilPos + 1 }} / {{ tamilOrder.length }}</span>
          <button type="button" class="primary nav-arrow" aria-label="Next question" (click)="nextTamilQuestion()" [disabled]="tamilPos >= tamilOrder.length - 1">›</button>
        </div>
      }
      @if (statsLine(); as sl) { <div class="results-line" aria-live="polite">{{ sl }}</div> }
      @if (practiceMode() === 'tenses' && (tenseMode() === 'english' || tenseMode() === 'tamil')) {
        <div class="mode-options practice-navigation compact-nav" aria-label="Tense practice navigation">
          <button type="button" class="nav-arrow" aria-label="Previous question" (click)="previousTenseQuestion()" [disabled]="tensePos <= 0">‹</button>
          <span>Question {{ tensePos + 1 }} / {{ tenseOrder.length }}</span>
          <button type="button" class="primary nav-arrow" aria-label="Next question" (click)="nextTenseQuestion()" [disabled]="tensePos >= tenseOrder.length - 1">›</button>
        </div>
      }
      @if (practiceMode() === 'fillBlank') {
        @if (currentFillBlank(); as blank) {
          <div class="mode-options fill-blank-tools fb-compact">
            <div class="fb-options" role="radiogroup" aria-label="Choose the missing word">
              <button type="button" class="fb-eye" [attr.aria-label]="fillOptionsShown() ? 'Hide options' : 'Show options'" [attr.title]="fillOptionsShown() ? 'Hide options' : 'Show options'" [attr.aria-pressed]="fillOptionsShown()" (click)="toggleFillOptions()">
                @if (fillOptionsShown()) {
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
              @if (fillOptionsShown()) {
                @for (option of blank.options; track option) {
                  <label class="fb-radio" [class.ok]="fillBlankSolved() && fillBlankLastAnswer() === option" [class.bad]="!fillBlankSolved() && fillBlankLastAnswer() === option">
                    <input type="radio" name="fillBlankOption" [value]="option" [checked]="fillBlankLastAnswer() === option" [disabled]="fillBlankSolved()" (change)="answerFillBlank(option)" />
                    <span>{{ option }}</span>
                  </label>
                }
              }
            </div>
            @if (fillBlankLastAnswer()) {
              <div class="fill-blank-result fb-result" [class.correct]="fillBlankSolved()">
                <b>{{ fillBlankSolved() ? 'Correct! நன்று!' : 'Try Again. மீண்டும் முயற்சி செய்யுங்கள்.' }}</b>
                @if (fillBlankSolved()) {
                  <p><b>Complete sentence:</b> {{ blank.full }}</p>
                  <p><b>Explanation:</b> {{ blank.explain }}</p>
                  <p lang="ta"><b>தமிழ் விளக்கம்:</b> {{ blank.explainTa }}</p>
                }
              </div>
            }
          </div>
          <div class="fb-lessonbar" aria-label="Fill in the Blank progress">
            <b class="fb-cat">{{ fillBlankCategoryLabel() }}</b>
            <span class="fb-nav">
              <button type="button" class="fb-arrow" aria-label="Previous question" (click)="previousFillBlankQuestion()" [disabled]="fillBlankIndex() <= 0">‹</button>
              <button type="button" class="fb-arrow primary" aria-label="Next question" (click)="nextFillBlankQuestion()" [disabled]="fillBlankIndex() >= blankQuestions.length - 1">›</button>
            </span>
            <span class="fb-count">{{ fillBlankIndex() + 1 }} / {{ blankQuestions.length }} · {{ fillBlankScore() }} correct</span>
          </div>
        }
      }
      @if (topicOpen()) {
        <div class="mode-options">
          <label>Conversation topic
            <select (change)="pickTopic($event)">
              <option value="">Select topic…</option>
              <option value="__next">Surprise me</option>
              @for (t of lela.topicChoices(); track t.id) { <option [value]="t.id">{{ t.title }}</option> }
            </select>
          </label>
        </div>
      }

      <!-- ===== Composer ===== -->
      <section class="composer-area" [hidden]="paragraphOpen()">
        @if (lela.sessionMode() && practiceMode() === 'chat') {
          <div class="mic-status" [class.on]="lela.phase() === 'listening'" role="status" aria-live="polite" data-testid="mic-status">
            <app-icon name="mic" [size]="16" /> {{ lela.micStatusText() }}
          </div>
        }
        @if (lela.phase() === 'listening' && practiceMode() === 'chat') { <div class="listening">● Listening… {{ lela.speech.interim() || lela.speech.heardFinal() }}</div> }
        @if (practiceListening()) { <div class="listening">● Listening… {{ practiceTranscript() }}</div> }
        <form class="composer" (submit)="send($event, messageInput)">
          <button class="control chat" type="button" (click)="focusChat(messageInput)"><app-icon name="chat" [size]="19" /><span class="lbl">Chat</span></button>
          <button class="control speak" type="button" (click)="startSpeak()" [disabled]="practiceMode() === 'chat' ? !lela.canListen : !lela.speech.recognitionSupported"><app-icon name="mic" [size]="19" /><span class="lbl">Speak</span></button>
          <button class="control stop" type="button" (click)="stopAll()"><app-icon name="stop" [size]="17" /><span class="lbl">Stop</span></button>
          <input #messageInput [disabled]="lela.phase() === 'thinking' && practiceMode() === 'chat'" placeholder="Type your message…" aria-label="Type your message" autocomplete="off" maxlength="500" />
          <button class="control send" type="submit" aria-label="Send message"><app-icon name="send" [size]="21" /></button>
        </form>
      </section>

      <!-- ===== Practice toolbar (same order as the design) ===== -->
      <nav class="toolbar" aria-label="Practice tools">
        <button type="button" [class.selected]="topicOpen()" (click)="toggleTopic()"><app-icon name="book" [size]="26" /><span>Topic</span></button>
        <button type="button" [class.selected]="practiceMode() === 'tamil'" (click)="startTamil(translationTopic())"><app-icon name="translate" [size]="26" /><span>Tamil →<br />English</span></button>
        <button type="button" (click)="setInterview()"><app-icon name="briefcase" [size]="26" /><span>Interview</span></button>
        <button type="button" [class.selected]="practiceMode() === 'tenses'" (click)="startTenses()"><app-icon name="clock" [size]="26" /><span>Tenses</span></button>
        <button type="button" [class.selected]="practiceMode() === 'preposition'" (click)="startPrepositions()"><app-icon name="text" [size]="26" /><span>Preposition</span></button>
        <button type="button" (click)="setDaily()"><app-icon name="calendar-check" [size]="26" /><span>Daily<br />Practice</span></button>
        <button type="button" (click)="openDictionary()"><app-icon name="book" [size]="26" /><span>My<br />Dictionary</span></button>
        <button type="button" class="end" (click)="endPractice()"><app-icon name="stop" [size]="26" /><span>End</span></button>
      </nav>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .lela-shell { --p: #5b21b6; --p2: #7c3aed; --soft: #efe8ff; --line: #e3d9f7; position: relative; display: flex; flex-direction: column; height: 100dvh; min-height: 420px; overflow: hidden; background: linear-gradient(#f4efff, #fbfaff 40%, #fff); color: #2a1a4a; }
    button { font-family: inherit; cursor: pointer; }

    /* Header */
    .topbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 10px 14px 18px; padding-top: max(10px, env(safe-area-inset-top)); color: #fff; background: linear-gradient(135deg, #4c1d95, #6d28d9 60%, #7c3aed); border-radius: 0 0 34px 34px / 0 0 22px 22px; box-shadow: 0 4px 16px rgba(76, 29, 149, .25); }
    .menu-btn { width: 40px; height: 40px; border: 0; background: transparent; color: #fff; border-radius: 12px; display: grid; place-items: center; flex: none; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; object-position: center 20%; border: 3px solid #fff; background: #ede9fe; box-shadow: 0 3px 10px rgba(0, 0, 0, .25); flex: none; }
    .avatar.talking { animation: pulse 1s infinite; }
    .identity { display: flex; flex-direction: column; min-width: 0; flex: 1 1 auto; line-height: 1.2; }
    .identity b { font-size: 1.6rem; font-weight: 700; }
    .identity small { font-size: .8rem; opacity: .95; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dot { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 50%; background: #4ade80; }
    .dot.off { background: #cbd5e1; }
    .head-modes { display: flex; flex: none; padding: 3px; border: 2px solid rgba(255, 255, 255, .85); border-radius: 999px; background: #fff; }
    .head-modes button { border: 0; background: transparent; color: var(--p); padding: 7px 12px; border-radius: 999px; font-size: .92rem; font-weight: 600; white-space: nowrap; }
    .head-modes button.active { background: var(--p2); color: #fff; }

    /* Panels */
    .menu-panel, .overlay-panel { position: absolute; z-index: 30; background: #fff; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 12px 34px rgba(60, 20, 120, .25); }
    .menu-panel { top: 76px; left: 10px; width: min(280px, 86vw); padding: 6px; display: flex; flex-direction: column; }
    .menu-panel button { display: flex; align-items: center; gap: 12px; padding: 12px; border: 0; background: transparent; border-radius: 10px; text-align: left; color: #3b2468; font-size: .95rem; }
    .menu-panel button:hover { background: #f5f0ff; }
    .overlay-panel { top: 84px; left: 10px; right: 10px; max-height: 60%; overflow: auto; padding: 12px 14px; }
    .settings-panel { display: grid; gap: 10px; font-size: .85rem; }
    .settings-panel label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .settings-panel select { max-width: 60%; }
    .panel-title { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--p); }
    .panel-title button { border: 0; background: transparent; font-size: 1.4rem; line-height: 1; }
    .solid { border: 0; background: var(--p2); color: #fff; border-radius: 10px; padding: 9px; }
    .history-row { display: block; width: 100%; padding: 10px 6px; text-align: left; border: 0; border-bottom: 1px solid #eee; background: #fff; }
    .play-mini { border: 0; background: transparent; color: var(--p); vertical-align: middle; }

    /* Conversation */
    .conversation { flex: 1 1 auto; min-height: 0; min-width: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; padding: 14px clamp(10px, 3vw, 24px) 8px; scroll-behavior: smooth; }
    .row { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 14px; min-width: 0; }
    .row.from-user { justify-content: flex-end; }
    .mini-avatar, .user-avatar { width: 46px; height: 46px; border-radius: 50%; flex: none; }
    .mini-avatar { object-fit: cover; object-position: center 20%; border: 2px solid #d9c9fb; background: #ede9fe; }
    .user-avatar { display: grid; place-items: center; background: #ede4ff; color: var(--p2); border: 2px solid #d9c9fb; }
    .bubble { min-width: 0; max-width: min(86%, 720px); padding: 10px 16px 12px; background: #fff; border: 1.5px solid var(--line); border-radius: 22px 22px 22px 6px; box-shadow: 0 3px 10px rgba(91, 33, 182, .07); overflow-wrap: anywhere; word-break: normal; }
    .user-bubble { background: #e6dcfc; border-color: #d6c6f7; border-radius: 22px 22px 6px 22px; text-align: right; }
    .who { display: block; font-size: 1.05rem; font-weight: 700; color: var(--p); }
    .text { max-width: 100%; margin: 2px 0 0; font-size: 1.08rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
    .tamil { max-width: 100%; margin: 6px 0 0; color: #6b46b3; font-size: .98rem; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
    .fix { margin: 8px 0 0; padding: 8px 12px; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa; font-size: 1rem; }
    .fix.ok { background: #ecfdf3; border-color: #bbf7d0; }
    .fix p { margin: 4px 0; overflow-wrap: anywhere; }
    .fix ul { margin: 2px 0 4px; padding-left: 22px; }
    .fix li { margin: 2px 0; overflow-wrap: anywhere; }
    .fix-ok { color: #15803d; }
    .seg { border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px; background: #fff; color: #4c1d95; font-weight: 700; }
    .seg.on { background: var(--p2); color: #fff; border-color: var(--p2); }
    .mic-status { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0 0 6px; padding: 5px 12px; border-radius: 999px; background: #f3f4f6; color: #4b5563; font-weight: 700; font-size: .85rem; }
    .mic-status.on { background: #dcfce7; color: #166534; }
    .results-line { margin: 0; padding: 6px 14px; background: #f5f0ff; color: #4c1d95; font-size: .85rem; text-align: center; overflow-wrap: anywhere; }
    .para-panel { display: block; min-width: 0; overflow-x: hidden; overflow-y: auto; overflow-wrap: anywhere; }
    .para-card { min-width: 0; max-width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: 14px; background: #fff; border: 1px solid var(--line); margin: 6px 0 10px; overflow-wrap: anywhere; }
    .para-tamil { font-size: 1.1rem; line-height: 1.7; margin: 6px 0 0; }
    .para-label { display: block; font-weight: 700; margin: 6px 0 4px; }
    .para-answer { display: block; width: 100%; max-width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d9cdee; border-radius: 12px; font: inherit; line-height: 1.6; resize: vertical; min-height: 120px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .para-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; min-width: 0; }
    .para-buttons .control { min-width: 86px; }
    .para-results { margin-top: 8px; }
    .para-sentence { background: #fff; }
    .box-label { display: flex; align-items: center; gap: 8px; margin: 12px 0 6px; font-size: 1.15rem; font-weight: 700; color: #15803d; }
    .box-label.wrong { color: #b45309; }
    .box { margin: 0; padding: 8px 14px; border-radius: 12px; background: #d3f5da; font-size: 1.1rem; }
    .box.wrong { background: #ffedd5; }
    .note { margin: 6px 0 0; font-size: .9rem; color: #5b4a7d; }
    .tamil-label { display: flex; align-items: center; gap: 8px; margin: 12px 0 2px; font-size: 1.1rem; font-weight: 700; color: var(--p); }
    .tamil-text { margin: 0; font-size: 1.05rem; white-space: pre-wrap; }
    .actions { display: flex; gap: 12px; margin-top: 10px; }
    .actions button { width: 40px; height: 40px; border: 0; border-radius: 50%; display: grid; place-items: center; background: var(--soft); color: var(--p); }
    .actions button.saved { color: #db2777; }
    .status-line { text-align: center; font-size: .82rem; color: #7c6a9c; padding: 4px; }
    .error-message { background: #fff0f0; color: #a12d35; padding: 8px 12px; border-radius: 10px; margin: 6px 0; }

    /* Practice option rows */
    .mode-options { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 6px 14px; background: #fff; border-top: 1px solid var(--line); font-size: .85rem; }
    .mode-options label { display: flex; align-items: center; gap: 8px; }
    .tense-count { color: #6b5b83; font-size: .78rem; align-self: center; }
    .mode-options select { max-width: 55vw; padding: 5px; border: 1px solid #d9cdee; border-radius: 8px; }
    .prep-options { align-items: flex-start; flex-direction: column; gap: 10px; }
    .prep-examples { width: 100%; display: grid; gap: 6px; }
    .prep-examples p { margin: 3px 0; line-height: 1.4; }
    .prep-examples small { display: block; color: #705b91; margin-top: 2px; }
    .prep-choice { display: flex; gap: 8px; flex-wrap: wrap; }
    .prep-choice button { border: 1px solid #6d28d9; border-radius: 10px; padding: 8px 16px; background: #6d28d9; color: #fff; font-weight: 700; }
    .prep-choice button + button { background: #fff; color: #5b21b6; }
    .prep-examples .prep-choice button { display:inline-flex; align-items:center; gap:5px; padding:7px 10px; font-size:.84rem; }
    .tense-wordbank { width: 100%; font-size: .8rem; }
    .tense-wordbank input { width: 100%; box-sizing: border-box; padding: 7px; margin-top: 6px; border: 1px solid #d9cdee; border-radius: 8px; }
    .wordbank-list { max-height: 120px; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 5px; padding: 6px 0; }

    /* Composer */
    .composer-area { padding: 8px 12px 6px; background: transparent; }
    .listening { font-size: .85rem; color: #9a4a1a; padding: 2px 6px 6px; }
    .composer { display: flex; align-items: center; gap: 8px; }
    .control { height: 48px; border: 0; border-radius: 999px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 1rem; font-weight: 700; color: #fff; white-space: nowrap; flex: none; }
    .control:disabled { opacity: .5; cursor: not-allowed; }
    .control.chat { background: var(--p); }
    .control.speak { background: #16a34a; }
    .control.stop { background: #ef4444; }
    .control.send { width: 52px; padding: 0; background: var(--p); box-shadow: 0 3px 8px rgba(91, 33, 182, .35); }
    .composer input { flex: 1 1 auto; min-width: 0; height: 48px; padding: 0 18px; border: 1.5px solid #cdbcf0; border-radius: 999px; background: #fff; font: inherit; font-size: 1rem; outline-color: var(--p2); }

    /* Toolbar */
    .practice-navigation { display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; min-width:0; width:100%; box-sizing:border-box; }
    .practice-navigation button,.fill-show-options { border:1px solid var(--line); border-radius:10px; padding:8px 13px; background:#fff; color:#4c1d95; font-weight:700; }
    .practice-navigation button.primary { background:var(--p2); color:#fff; border-color:var(--p2); }
    .practice-navigation button:disabled { opacity:.4; cursor:not-allowed; }
    .practice-navigation span,.fill-blank-meta span { color:#6b5b83; font-size:.82rem; text-align:center; overflow-wrap:anywhere; }
    .fill-blank-tools { display:grid; gap:9px; }
    .fill-blank-meta { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .fill-blank-choices { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
    .fill-blank-choices button { border:1px solid var(--line); background:#fff; color:#4c1d95; border-radius:9px; padding:8px 5px; font-weight:700; }
    .fill-blank-choices button:disabled { opacity:.55; }
    .fill-blank-result { border-radius:10px; background:#fff4e8; border:1px solid #f0d2a8; padding:9px 12px; font-size:.88rem; }
    .fill-blank-result.correct { background:#effaf2; border-color:#9ad1a7; }
    .fill-blank-result p { margin:6px 0 0; line-height:1.55; }
    @media(max-width:520px){ .fill-blank-choices { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    /* Compact Fill in the Blank: icon + small radios, short feedback, lesson bar above the composer */
    .fb-compact { gap: 4px; padding: 5px 12px 6px; border-top: 0; }
    .fb-options { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 14px; min-height: 28px; }
    .fb-eye { flex: none; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #4c1d95; display: grid; place-items: center; }
    .fb-radio { display: inline-flex; align-items: center; gap: 5px; margin: 0; padding: 2px 0; font-size: .9rem; color: #6b5aa8; cursor: pointer; }
    .fb-radio input { margin: 0; width: 15px; height: 15px; accent-color: #7c3aed; cursor: pointer; }
    .fb-radio input:disabled { cursor: default; }
    .fb-radio.ok { color: #14532d; font-weight: 700; }
    .fb-radio.ok input { accent-color: #16a34a; }
    .fb-radio.bad { color: #b45309; font-weight: 700; }
    .fb-radio.bad input { accent-color: #d97706; }
    .fb-result { padding: 6px 10px; font-size: .84rem; line-height: 1.4; }
    .fb-result p { margin: 2px 0 0; line-height: 1.4; }
    .fb-lessonbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; box-sizing: border-box; padding: 5px 14px; background: #f6f3ff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: .82rem; color: #2a1a4a; }
    .fb-cat { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
    .fb-nav { flex: none; display: inline-flex; align-items: center; gap: 6px; }
    .fb-arrow { width: 24px; height: 24px; min-height: 0; padding: 0; border: 1px solid var(--line); border-radius: 50%; background: #fff; color: #4c1d95; font-size: 1.05rem; line-height: 1; display: grid; place-items: center; }
    .fb-arrow.primary { background: var(--p2); border-color: var(--p2); color: #fff; }
    .fb-arrow:disabled { opacity: .4; cursor: not-allowed; }
    .fb-count { flex: 1 1 0; min-width: 0; text-align: right; color: #6b5b83; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .toolbar { display: flex; align-items: stretch; margin: 0 8px max(8px, env(safe-area-inset-bottom)); padding: 8px 4px; background: #ece5fb; border: 1px solid var(--line); border-radius: 22px; }
    .toolbar button { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; padding: 2px 1px; border: 0; border-right: 1px solid #d9cdee; border-radius: 0; background: transparent; color: var(--p); font-size: .8rem; font-weight: 600; line-height: 1.15; text-align: center; }
    .toolbar button:last-child { border-right: 0; }
    .toolbar button.selected { background: #fff; color: var(--p); border-radius: 12px; }
    .toolbar button.end { color: #ef4444; }
    .toolbar span { overflow-wrap: normal; word-break: normal; }

    /* Keep long Tamil/English prompts readable in every practice mode. */
    .mode-options { min-width: 0; max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere; }
    .para-results, .para-sentence, .fix, .box, .note, .tamil-text { min-width: 0; max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere; word-break: normal; }
    .para-sentence p, .para-sentence li, .fix p, .fix li { line-height: 1.65; overflow-wrap: anywhere; }
    .practice-navigation button { min-height: 40px; white-space: normal; }
    /* ---- Practice dropdown + compact < Question 2 / 44 > ---- */
    .head-modes .practice-toggle { background: var(--soft); font-weight: 700; }
    .head-modes .practice-toggle.open { background: var(--p2); color: #fff; }
    .practice-dropdown { position: absolute; top: var(--topbar-h, 64px); left: 8px; right: 8px; z-index: 15; max-height: 70dvh; overflow: auto; border: 0; border-radius: 14px; padding: 10px 12px; box-shadow: 0 8px 24px rgba(76, 29, 149, .28); }
    .practice-dropdown[hidden] { display: none; }
    .compact-nav { padding: 2px 8px; gap: 8px; border-top: 0; background: transparent; justify-content: center; flex-wrap: nowrap; }
    .compact-nav span { font-size: .75rem; flex: 0 0 auto; order: 0; }
    .practice-navigation .nav-arrow { flex: 0 0 auto; width: 28px; height: 28px; min-height: 0; padding: 0; border-radius: 50%; font-size: 1.15rem; line-height: 1; }
    @media (max-width: 520px) {
      .practice-navigation { gap: 6px; padding-left: 8px; padding-right: 8px; }
      .practice-navigation button { flex: 1 1 105px; padding: 9px 8px; }
      .practice-navigation .nav-arrow { flex: 0 0 28px; padding: 0; }
      .practice-navigation span { flex: 1 1 100%; order: -1; }
      .practice-navigation.compact-nav span, .practice-navigation:has(.nav-arrow) span { flex: 0 0 auto; order: 0; }
      .para-buttons .control { flex: 1 1 86px; }
      .para-buttons .para-submit { flex-basis: 100%; }
      .para-results .results-line { line-height: 1.6; }
    }

    @keyframes pulse { 50% { box-shadow: 0 0 0 6px rgba(255, 255, 255, .35); } }
    @media (min-width: 900px) { .conversation { padding-left: clamp(24px, 8vw, 140px); padding-right: clamp(24px, 8vw, 140px); } .toolbar { margin-left: auto; margin-right: auto; width: min(1000px, 96%); } .composer { max-width: 1000px; margin: 0 auto; } }
    @media (max-width: 560px) {
      .topbar { padding-left: 8px; padding-right: 8px; }
      .head-modes { order: 5; width: 100%; justify-content: space-between; }
      .head-modes button { flex: 1 1 0; padding: 6px 4px; font-size: .85rem; }
      .identity b { font-size: 1.3rem; }
      .avatar { width: 48px; height: 48px; }
      .mini-avatar, .user-avatar { width: 36px; height: 36px; }
      .bubble { max-width: 84%; padding: 8px 12px 10px; }
      .text { font-size: 1rem; }
      .composer { gap: 5px; }
      .control { height: 44px; padding: 0 11px; font-size: .9rem; }
      .control.send { width: 44px; }
      .composer input { height: 44px; padding: 0 12px; min-width: 60px; }
      .toolbar { margin: 0 4px max(6px, env(safe-area-inset-bottom)); border-radius: 18px; }
      .toolbar { padding: 8px 2px; }
      .toolbar button { font-size: 9px; letter-spacing: -.2px; gap: 3px; padding: 2px 0; }
      .toolbar app-icon svg { width: 22px; height: 22px; }
    }
    @media (max-width: 400px) { .control .lbl { display: none; } .control { padding: 0 12px; } }
    @media (prefers-reduced-motion: reduce) { .avatar.talking { animation: none; } .conversation { scroll-behavior: auto; } }
  `],
})
export class LelaComponent implements OnInit, OnDestroy {
  readonly lela = inject(LelaConversationService);
  private readonly http = inject(HttpClient);
  private readonly data = inject(DataService);
  private readonly onlineSentenceLibrary = inject(OnlineSentenceLibraryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly corrector = inject(LELA_CORRECTOR);
  private readonly storage = inject(StorageService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Keeps the Practice dropdown right under the header, whatever height the header has on this screen. */
  private readonly syncMenuTop = effect(() => { if (this.practiceMenuOpen()) queueMicrotask(() => this.syncTopbarHeight()); });

  @ViewChild('scrollBox') private scrollBox?: ElementRef<HTMLElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLInputElement>;

  // ----- screen state -----
  readonly headerMode = signal<HeaderMode>('voice');
  readonly menuOpen = signal(false);
  readonly panel = signal<'settings' | 'history' | 'fav' | 'info' | null>(null);
  readonly viewing = signal<SavedConversation | null>(null);
  readonly topicOpen = signal(false);
  /** Practice ▾ dropdown in the header (holds the practice controls so they do not take chat space). */
  readonly practiceMenuOpen = signal(false);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  // ----- practice state -----
  readonly practiceMode = signal<PracticeKind>('chat');
  readonly practiceMessages = signal<PracticeMessage[]>([]);
  readonly loadingPractice = signal(false);
  readonly practiceListening = signal(false);
  readonly practiceTranscript = signal('');
  readonly questionAnswered = signal(false);

  // ----- Tamil → English: Sentence Practice / Paragraph Practice (same session) -----
  readonly tamilKind = signal<'sentence' | 'paragraph'>('sentence');
  readonly paragraphLevels = PARAGRAPH_LEVELS;
  readonly paragraphLevel = signal<ParagraphLevel>('Beginner');
  readonly paragraphs = signal<ParagraphItem[]>([]);
  readonly paragraphsLoading = signal(false);
  readonly paragraphError = signal('');
  readonly paraPos = signal(0);
  readonly paraAnswer = signal('');
  readonly paraResult = signal<(ParagraphResult & { sentences: (ParagraphResult['sentences'][number] & { mistakeLines: string[] })[] }) | null>(null);
  readonly paraChecking = signal(false);
  readonly paraListening = signal(false);
  readonly paraInterim = signal('');
  readonly paraTotals = signal<{ paragraphs: number; total: number; correct: number; mistakes: number } | null>(null);
  readonly paragraphOpen = computed(() => this.practiceMode() === 'tamil' && this.tamilKind() === 'paragraph');
  readonly paraList = computed(() => this.paragraphs().filter((p) => p.level === this.paragraphLevel()));
  readonly currentParagraph = computed(() => this.paraList()[this.paraPos()]);
  /** "said" when the answer is exactly what the microphone heard, "wrote" when the learner typed or edited it. */
  readonly paraLabel = computed<'wrote' | 'said'>(() => (this.paraSpokenSig() && this.paraSpokenSig() === this.paraAnswer().trim() ? 'said' : 'wrote'));
  private readonly paraSpokenSig = signal('');
  private paraSub: Subscription | null = null;

  // ----- session results for sentence practices -----
  readonly practiceStats = signal<Record<string, { total: number; correct: number; mistakes: number }>>({});
  readonly statsLine = computed(() => {
    const mode = this.practiceMode();
    let key = '';
    if (mode === 'tamil' && this.tamilKind() === 'sentence') key = 'tamil-sentence';
    else if (mode === 'tenses' && (this.tenseMode() === 'english' || this.tenseMode() === 'tamil')) key = 'tense';
    const s = this.practiceStats()[key];
    if (!s || !s.total) return '';
    return `Results · Total sentences: ${s.total} · Correct: ${s.correct} · Incorrect: ${s.total - s.correct} · Total mistakes: ${s.mistakes} · Score: ${Math.round((s.correct / s.total) * 100)}%`;
  });
  private answerFromMic = false;
  readonly blankQuestions: BlankQuestion[] = buildBlankBank();
  readonly fillBlankIndex = signal(0);
  readonly fillBlankScore = signal(0);
  readonly fillBlankCorrectIds = signal<string[]>([]);
  readonly fillOptionsShown = signal(false);
  readonly fillBlankSolved = signal(false);
  readonly fillBlankLastAnswer = signal('');
  readonly currentFillBlank = computed(() => this.blankQuestions[this.fillBlankIndex()] ?? null);
  readonly fillBlankCategoryLabel = computed(() => { const q = this.currentFillBlank(); return q ? BLANK_CATEGORY_LABEL[q.category] : ''; });

  readonly translationTopics = Object.keys(TRANSLATIONS);
  readonly translationTopic = signal('Daily life');
  /** Existing topic choices backed by the complete public/data/sentences library (maximum 2,000 unique pairs). */
  readonly translationPools = signal<Record<string, TranslationItem[]>>(TRANSLATIONS);
  /** All existing sentence pairs classified into the selected one of the 12 tense pools. */
  readonly tenseTamilPools = signal<Partial<Record<TenseId, TenseTamilItem[]>>>({});
  readonly practiceLibraryLoading = signal(false);
  readonly onlineSentenceLoading = signal(false);
  readonly onlineSentenceStatus = signal('');
  private practiceLibraryLoaded = false;
  readonly tenses = TENSES;
  readonly selectedTense = signal('present-simple');
  readonly tenseLessons = signal<GrammarLesson[]>([]);
  readonly selectedTenseLesson = computed(() => {
    const id = this.selectedTense() === 'future-simple' ? 'future-will' : this.selectedTense();
    return this.tenseLessons().find(x => x.id === id) ?? null;
  });
  readonly selectedTenseExamples = computed(() => {
    const lesson = this.selectedTenseLesson();
    if (!lesson) return [];
    const combined = [...lesson.examples, ...lesson.uses].filter((x, i, all) => all.findIndex(y => norm(y.en) === norm(x.en)) === i);
    const fallback = this.selectedTenseInfo();
    if (combined.length < 8 && !combined.some(x => norm(x.en) === norm(fallback.en))) combined.push({ en: fallback.en, tamil: fallback.ta });
    return combined.slice(0, 8);
  });
  /** 'ask' = the "How would you like to practise?" choice is showing. */
  readonly tenseMode = signal<'ask' | 'english' | 'tamil'>('ask');
  readonly tenseLessonShown = signal(false);
  readonly tenseWords = signal<Word[]>([]);
  readonly tenseWordSearch = signal('');
  /** Built-in preposition lessons (always available), plus any extra words from the optional data file. */
  readonly prepLessons = signal<PrepLesson[]>(PREPOSITION_LESSONS);
  readonly prepQuestionList = signal<PrepQuestion[]>([]);
  readonly prepIndex = signal(0);
  readonly selectedPreposition = signal('');
  readonly prepositionWords = computed(() => this.prepLessons().map(x => x.word));
  readonly selectedPrepositionLesson = computed(() => this.prepLessons().find(x => x.word === this.selectedPreposition()) ?? null);

  readonly selectedTenseInfo = computed(() => this.tenses.find((x) => x.id === this.selectedTense()) ?? this.tenses[0]);
  readonly selectedTenseTamilCount = computed(() => this.currentTenseTamilItems().length);
  readonly currentPreposition = computed(() => this.prepQuestionList()[this.prepIndex()] ?? null);
  readonly filteredTenseWords = computed(() => {
    const q = this.tenseWordSearch().trim().toLocaleLowerCase();
    return this.tenseWords().filter((w) => !q || w.word.toLocaleLowerCase().includes(q) || w.tamil.includes(q)).slice(0, 50);
  });
  readonly statusText = computed(() => {
    const s = this.lela.status();
    return s === 'Ready' ? 'Ready to chat' : s;
  });
  readonly practiceTitle = computed(() => {
    switch (this.practiceMode()) {
      case 'tamil': return `Tamil → English · ${this.translationTopic()}`;
      case 'tenses': return `Tenses · ${this.selectedTenseInfo().name}${this.tenseMode() === 'english' ? ' · English Practice' : this.tenseMode() === 'tamil' ? ' · Tamil to English Practice' : ''}`;
      case 'preposition': return `Preposition fill in the blank · Question ${this.prepIndex() + 1}`;
      case 'fillBlank': return `Fill in the Blank · ${this.fillBlankCategoryLabel()} · Question ${this.fillBlankIndex() + 1} of ${this.blankQuestions.length}`;
      default: return '';
    }
  });

  /** The one list the template draws: real chat messages, or the current practice exercise. */
  readonly view = computed<ViewMessage[]>(() => {
    if (this.practiceMode() !== 'chat') {
      return this.practiceMessages().map((m) => ({
        key: `p${m.id}`,
        from: m.from,
        text: m.text,
        tamil: m.tamil,
        boxLabel: m.boxLabel,
        box: m.box,
        boxOk: m.boxOk,
        notes: m.notes ?? [],
        tamilExplain: m.tamilExplain,
        fix: m.fix,
        speak: m.speak ?? m.fix?.corrected ?? m.box ?? m.text,
      }));
    }
    const list = this.lela.messages();
    const showTamil = this.lela.showTamil();
    return list.map((m, i) => this.toView(m, list[i - 1], showTamil));
  });

  private practiceSub: Subscription | null = null;
  private autoTimer?: ReturnType<typeof setTimeout>;
  private nextId = 1;
  private starting: Promise<void> | null = null;
  tamilOrder: number[] = [];
  tamilPos = 0;
  private lastTamilTa = '';
  private translationPositions: Record<string, number> = {};
  tenseOrder: number[] = [];
  tensePos = 0;
  private tensePositions: Record<string, { english: number; tamil: number }> = {};
  private readonly progressKey = 'lela-practice-session-progress-v1';

  private savePracticeProgress(): void {
    if (this.practiceMode() === 'tamil') this.translationPositions[this.translationTopic()] = this.tamilPos;
    const activeTenseMode = this.tenseMode();
    if (this.practiceMode() === 'tenses' && (activeTenseMode === 'english' || activeTenseMode === 'tamil')) {
      const current = this.tensePositions[this.selectedTense()] ?? { english: 0, tamil: 0 };
      current[activeTenseMode] = this.tensePos;
      this.tensePositions[this.selectedTense()] = current;
    }
    this.storage.write(this.progressKey, JSON.stringify({
      activePracticeMode: this.practiceMode(), translationTopic: this.translationTopic(), tamilOrder: this.tamilOrder,
      tamilPos: this.tamilPos, translationPositions: this.translationPositions, selectedTense: this.selectedTense(),
      tenseMode: this.tenseMode(), tenseOrder: this.tenseOrder, tensePos: this.tensePos, tensePositions: this.tensePositions,
      fillBlankIndex: this.fillBlankIndex(), fillBlankScore: this.fillBlankScore(), fillBlankCorrectIds: this.fillBlankCorrectIds(),
    }));
  }

  private restorePracticeProgress(): void {
    const raw = this.storage.read(this.progressKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        activePracticeMode?: PracticeKind; translationTopic?: string; tamilOrder?: number[]; tamilPos?: number;
        translationPositions?: Record<string, number>; selectedTense?: string; tenseMode?: 'ask' | 'english' | 'tamil';
        tenseOrder?: number[]; tensePos?: number; tensePositions?: Record<string, { english: number; tamil: number }>;
        fillBlankIndex?: number; fillBlankScore?: number; fillBlankCorrectIds?: string[];
      };
      if (saved.translationTopic && TRANSLATIONS[saved.translationTopic]) this.translationTopic.set(saved.translationTopic);
      if (Array.isArray(saved.tamilOrder) && saved.tamilOrder.every(Number.isInteger)) this.tamilOrder = saved.tamilOrder;
      if (Number.isInteger(saved.tamilPos)) this.tamilPos = Math.max(0, saved.tamilPos ?? 0);
      if (saved.translationPositions && typeof saved.translationPositions === 'object') this.translationPositions = saved.translationPositions;
      if (saved.selectedTense && this.tenses.some(t => t.id === saved.selectedTense)) this.selectedTense.set(saved.selectedTense);
      if (saved.tenseMode === 'english' || saved.tenseMode === 'tamil' || saved.tenseMode === 'ask') this.tenseMode.set(saved.tenseMode);
      if (Array.isArray(saved.tenseOrder) && saved.tenseOrder.every(Number.isInteger)) this.tenseOrder = saved.tenseOrder;
      if (Number.isInteger(saved.tensePos)) this.tensePos = Math.max(0, saved.tensePos ?? 0);
      if (saved.tensePositions && typeof saved.tensePositions === 'object') this.tensePositions = saved.tensePositions;
      if (Number.isInteger(saved.fillBlankIndex)) this.fillBlankIndex.set(Math.min(this.blankQuestions.length - 1, Math.max(0, saved.fillBlankIndex ?? 0)));
      if (Array.isArray(saved.fillBlankCorrectIds)) {
        const validIds = saved.fillBlankCorrectIds.filter(id => this.blankQuestions.some(q => q.id === id));
        this.fillBlankCorrectIds.set(validIds); this.fillBlankScore.set(validIds.length);
      } else if (Number.isInteger(saved.fillBlankScore)) this.fillBlankScore.set(Math.max(0, saved.fillBlankScore ?? 0));
      if (saved.activePracticeMode && ['chat', 'tamil', 'tenses', 'preposition', 'fillBlank'].includes(saved.activePracticeMode)) this.practiceMode.set(saved.activePracticeMode);
    } catch { /* Ignore an incomplete or older progress record. */ }
  }

  private restorePracticeSession(): void {
    const mode = this.practiceMode();
    if (mode === 'tamil' || mode === 'tenses') this.practiceMenuOpen.set(false);
    if (mode === 'fillBlank') { this.askFillBlankQuestion(); return; }
    if (mode === 'preposition') { void this.startPrepositions(); return; }
    if (mode === 'tamil') {
      void this.loadPracticeSentenceLibrary();
      const tamilCount = this.translationPool().length;
      if (this.tamilOrder.length !== tamilCount || this.tamilOrder.some(index => index < 0 || index >= tamilCount)) this.tamilOrder = Array.from({ length: tamilCount }, (_, i) => i);
      this.tamilPos = Math.min(this.translationPositions[this.translationTopic()] ?? this.tamilPos, Math.max(0, this.tamilOrder.length - 1));
      this.askTamil('Continue your Tamil → English practice:'); return;
    }
    if (mode === 'tenses') {
      void this.loadPracticeSentenceLibrary();
      this.tenseLessonShown.set(true);
      const tenseMode = this.tenseMode();
      if (tenseMode === 'english' || tenseMode === 'tamil') {
        const size = tenseMode === 'english' ? this.currentTenseEnglishPrompts().length : this.currentTenseTamilItems().length;
        if (this.tenseOrder.length !== size || this.tenseOrder.some(index => index < 0 || index >= size)) this.tenseOrder = Array.from({ length: size }, (_, i) => i);
        const savedPosition = this.tensePositions[this.selectedTense()]?.[tenseMode];
        const position = typeof savedPosition === 'number' && Number.isFinite(savedPosition) ? savedPosition : this.tensePos;
        this.tensePos = Math.min(position, Math.max(0, this.tenseOrder.length - 1));
        this.askTense();
      } else this.showTenseLesson();
    }
  }

  constructor() {
    effect(() => {
      this.view();
      this.loadingPractice();
      queueMicrotask(() => this.scrollDown());
    });
  }

  ngOnInit(): void {
    const requested = this.route.snapshot.queryParamMap.get('mode');
    if (requested === 'auto' || requested === 'manual' || requested === 'text' || requested === 'voice') this.headerMode.set(requested);
    void this.initialize();
    this.restorePracticeProgress();
    this.restorePracticeSession();
    void this.loadTenseWords();
    void this.loadTenseLessons();
    if (this.route.snapshot.queryParamMap.get('practice') === 'preposition') void this.startPrepositions();
  }

  ngOnDestroy(): void {
    this.lela.endSession();
    this.stopParagraphMic();
    this.practiceSub?.unsubscribe();
    clearTimeout(this.autoTimer);
    this.lela.pause();
  }

  @HostListener('window:online') goOnline(): void { this.online.set(true); }
  @HostListener('window:offline') goOffline(): void { this.online.set(false); }

  // ===== Chat messages → view =====

  private toView(m: LelaMessage, prev: LelaMessage | undefined, showTamil: boolean): ViewMessage {
    const view: ViewMessage = { key: `c${m.id}`, from: m.from, text: m.text, notes: [], speak: m.correction?.corrected ?? m.text, source: m };
    if (m.from !== 'lela') return view;

    const c = m.correction;
    if (c) {
      // What I said → Correct sentence → Grammar explanation → Tamil explanation → Natural spoken English.
      // The original sentence is always shown exactly as it was sent; the correction is shown separately.
      const fb = buildFeedback(c.original, { ...c, changed: true });
      const lines = feedbackLines(fb);
      view.text = `${lines.said}\n\n${m.text}`;
      const repeated = norm(m.text).includes(norm(c.corrected));
      if (!repeated || norm(c.original) !== norm(c.corrected)) { view.boxLabel = lines.sentenceLabel; view.box = c.corrected; view.boxOk = true; }
      view.notes = lines.notes;
      view.tamilExplain = lines.tamil;
      return view;
    }
    if (prev?.from === 'user' && prev.looksCorrect) {
      view.boxLabel = 'Your sentence is correct:';
      view.box = prev.text;
      view.boxOk = true;
      view.notes = ['Grammar explanation: Your sentence is grammatically correct. Well done!'];
      view.tamilExplain = CORRECT_TAMIL;
    }
    if (m.tamil && showTamil && norm(m.tamil) !== norm(m.text)) view.tamil = m.tamil;
    return view;
  }

  // ===== Start-up =====

  /** Safe to call many times at once: Lela is started only once, so her greeting is never duplicated. */
  private initialize(): Promise<void> {
    this.starting ??= this.doInitialize().finally(() => { this.starting = null; });
    return this.starting;
  }

  private async doInitialize(): Promise<void> {
    await this.lela.load();
    this.lela.setLiveMode(false);
    this.lela.setMicOn(false);
    this.lela.setAutoListen(false);
    this.lela.setVoiceOn(this.headerMode() !== 'text');
    if (isVoiceSession(this.headerMode())) {
      // Voice Session: always a fresh session. Lela speaks first with the microphone OFF; her real end of speech turns it on.
      this.lela.beginSession();
      if (this.lela.active()) await this.lela.newConversation();
      else await this.lela.start();
      return;
    }
    this.lela.endSession();
    if (!this.lela.active()) await this.lela.start();
  }

  private async loadTenseWords(): Promise<void> {
    try {
      const manifest = await this.data.manifest();
      const lists = await Promise.all(manifest.vocabCategories.map((c) => this.data.vocabulary(c.id)));
      const seen = new Set<string>();
      const words = lists.flat().filter((w) => {
        const key = w.word.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 1500);
      this.tenseWords.set(words);
    } catch {
      this.tenseWords.set([]);
    }
  }

  // ===== Header, menu, panels =====

  toggleMenu(): void { this.menuOpen.update((v) => !v); }
  goHome(): void { this.menuOpen.set(false); void this.router.navigate(['/']); }
  openDictionary(): void { this.menuOpen.set(false); void this.router.navigate(['/dictionary']); }
  openPanel(name: 'settings' | 'history' | 'fav' | 'info'): void { this.menuOpen.set(false); this.panel.set(name); }
  openHistory(h: SavedConversation): void { this.viewing.set(h); this.panel.set(null); }

  setHeaderMode(mode: HeaderMode): void {
    const wasSession = isVoiceSession(this.headerMode()) && this.lela.sessionMode();
    this.headerMode.set(mode);
    this.lela.setVoiceOn(mode !== 'text');
    if (isVoiceSession(mode)) {
      if (wasSession) return; // Voice and Auto are the same session: nothing restarts
      if (this.practiceMode() !== 'chat') this.endExercise();
      // Entering the Voice Session starts a fresh one: Lela speaks first, the microphone stays OFF until she has finished.
      this.lela.beginSession();
      void this.lela.newConversation();
      return;
    }
    // Normal chat (Manual / Text): no automatic listening.
    this.lela.endSession();
    this.lela.setLiveMode(false);
    this.lela.setAutoListen(false);
    this.lela.setMicOn(false);
  }

  private translationPool(topic = this.translationTopic()): TranslationItem[] {
    return this.translationPools()[topic] ?? [];
  }

  private currentTenseTamilItems(): TenseTamilItem[] {
    return this.tenseTamilPools()[this.selectedTense() as TenseId] ?? this.tenseLesson.tamil;
  }

  /** English practice uses the lesson prompts plus every existing sentence classified for this tense. */
  private currentTenseEnglishPrompts(): string[] {
    const lesson = this.tenseLesson;
    const examples = this.currentTenseTamilItems().map(item =>
      `Write your own ${lesson.name.toLocaleLowerCase()} sentence. Use this existing sentence as a guide: “${item.model}”${item.note ? `\n${item.note}` : ''}`,
    );
    return [...lesson.prompts, ...examples];
  }

  /** Manually fetches additional free, attributed Tamil-English pairs from Tatoeba. */
  async fetchFreeOnlineSentences(): Promise<void> {
    if (this.onlineSentenceLoading()) return;
    if (!this.online()) {
      this.onlineSentenceStatus.set('Connect to the internet to fetch new sentences.');
      return;
    }
    this.onlineSentenceLoading.set(true);
    this.onlineSentenceStatus.set('Checking for new free Tamil-English sentences…');
    try {
      const result = await this.onlineSentenceLibrary.syncIfDue(true);
      const known = new Set((this.translationPools()['Daily life'] ?? []).map(item =>
        item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, ''),
      ));
      const additions: TranslationItem[] = result.sentences
        .filter(item => item.sourceAttribution?.source === 'Tatoeba')
        .map(item => ({
          ta: item.tamil,
          answers: [item.en, ...(item.alt?.en ? [item.alt.en] : [])],
          note: item.context || 'Free community-contributed sentence from Tatoeba.',
        }))
        .filter(item => {
          const key = item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
          if (!key || known.has(key)) return false;
          known.add(key);
          return true;
        });
      if (additions.length) {
        const oldLength = this.translationPools()['Daily life']?.length ?? 0;
        this.translationPools.update(pools => ({ ...pools, 'Daily life': [...(pools['Daily life'] ?? []), ...additions] }));
        if (this.translationTopic() === 'Daily life' && this.practiceMode() === 'tamil' && this.tamilKind() === 'sentence') {
          this.tamilOrder = [...this.tamilOrder, ...Array.from({ length: additions.length }, (_, index) => oldLength + index)];
        }
        this.onlineSentenceStatus.set(`${additions.length} new free sentences added to Daily life. Choose that topic to practise them.`);
      } else {
        this.onlineSentenceStatus.set('No new Tamil-English pairs were found. Your saved offline sentences are still available.');
      }
    } catch {
      this.onlineSentenceStatus.set('Could not connect to the free sentence source. Please try again later.');
    } finally {
      this.onlineSentenceLoading.set(false);
    }
  }

  /** Loads the existing sentence JSON files once and connects them to the current practice screens. */
  private async loadPracticeSentenceLibrary(): Promise<void> {
    if (this.practiceLibraryLoaded || this.practiceLibraryLoading()) return;
    this.practiceLibraryLoading.set(true);
    try {
      const manifest = await this.data.manifest();
      const categories: SentenceCategorySource[] = await Promise.all(
        manifest.sentenceCategories.map(async category => ({ id: category.id, sentences: await this.data.sentences(category.id) })),
      );
      const online = await this.onlineSentenceLibrary.syncIfDue();
      const allCategories: SentenceCategorySource[] = online.sentences.length
        ? [...categories, { id: 'daily-conversation', sentences: online.sentences }]
        : categories;
      const totalAvailable = categories.reduce((sum, category) => sum + category.sentences.length, 0) + online.sentences.length
        + Object.values(TRANSLATIONS).reduce((sum, items) => sum + items.length, 0);
      this.translationPools.set(buildTranslationPracticePools(allCategories, TRANSLATIONS, Math.max(2000, totalAvailable)));
      this.tenseTamilPools.set(buildTensePracticePools(allCategories, TENSE_LESSONS.reduce((all, lesson) => {
        all[lesson.id] = lesson.tamil;
        return all;
      }, {} as Record<TenseId, TenseTamilItem[]>)));
      this.practiceLibraryLoaded = true;

      // If the learner opened a session while the files were loading, refresh only its question pool.
      if (this.practiceMode() === 'tamil' && this.tamilKind() === 'sentence') {
        const pool = this.translationPool();
        this.tamilOrder = Array.from({ length: pool.length }, (_, index) => index);
        this.tamilPos = Math.min(this.tamilPos, Math.max(0, pool.length - 1));
        this.practiceMessages.set([]);
        this.askTamil('Continue your Tamil → English practice:');
      } else if (this.practiceMode() === 'tenses' && (this.tenseMode() === 'tamil' || this.tenseMode() === 'english')) {
        const size = this.tenseMode() === 'tamil' ? this.currentTenseTamilItems().length : this.currentTenseEnglishPrompts().length;
        this.tenseOrder = Array.from({ length: size }, (_, index) => index);
        this.tensePos = Math.min(this.tensePos, Math.max(0, size - 1));
        this.practiceMessages.set([]);
        this.askTense();
      }
    } catch {
      // The original built-in questions remain available if the sentence library cannot be loaded.
    } finally {
      this.practiceLibraryLoading.set(false);
    }
  }

  private async loadTenseLessons(): Promise<void> {
    try {
      const lessons = await this.data.grammar();
      this.tenseLessons.set(lessons.filter(x => this.tenses.some(t => t.id === x.id)));
    } catch {
      this.tenseLessons.set([]);
    }
  }

  // ===== Sending, speaking, stopping =====

  async send(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (this.practiceMode() === 'chat') {
      if (!this.lela.active()) await this.initialize();
      await this.lela.submit(text, 'typed');
    } else {
      this.checkPracticeAnswer(text);
    }
    this.scrollDown();
  }

  /** "Chat" button: leave any exercise, go back to the normal conversation and put the cursor in the box. */
  focusChat(input: HTMLInputElement): void {
    if (this.practiceMode() !== 'chat') this.endExercise();
    this.topicOpen.set(false);
    if (!this.lela.active()) void this.initialize();
    input.focus();
  }

  /** Replay button: puts a sentence into the box so the learner can type it or say it back. */
  practiseSentence(sentence: string): void {
    const input = this.messageInput?.nativeElement;
    if (!input) return;
    input.value = sentence;
    input.focus();
  }

  startSpeak(): void {
    if (this.practiceMode() === 'chat') {
      if (!this.lela.active()) {
        void this.initialize().then(() => { if (this.headerMode() !== 'auto') this.startSpeak(); });
        return;
      }
      if (!this.lela.micOn()) this.lela.setMicOn(true);
      this.lela.tapMic();
      return;
    }
    void this.startPracticeRecognition();
  }

  private async startPracticeRecognition(): Promise<void> {
    if (this.practiceListening()) return;
    this.lela.stopSpeaking();
    try {
      const permission = await this.lela.speech.requestMicPermission();
      if (permission === 'denied') throw new Error('Microphone permission is blocked. Allow it in app settings.');
      this.practiceTranscript.set('');
      this.practiceListening.set(true);
      let heardFinal = false;
      this.practiceSub = this.lela.speech.listen('en-IN').subscribe({
        next: (e) => {
          if (e.transcript) this.practiceTranscript.set(e.transcript);
          if (e.isFinal && e.transcript.trim() && !heardFinal) {
            heardFinal = true;
            this.practiceListening.set(false);
            this.practiceSub?.unsubscribe();
            this.practiceSub = null;
            this.answerFromMic = true;
            this.checkPracticeAnswer(e.transcript.trim());
            this.answerFromMic = false;
          }
        },
        error: (e) => {
          this.practiceListening.set(false);
          this.practiceSub = null;
          this.addPractice('lela', e instanceof Error ? e.message : 'Could not hear you. Please type your answer.');
        },
        complete: () => {
          const wasListening = this.practiceListening();
          this.practiceListening.set(false);
          this.practiceSub = null;
          // Silence or noise gave no usable words: nothing is submitted. Ask again instead of guessing.
          if (wasListening && !heardFinal) this.addPractice('lela', 'I could not hear you clearly. Please say it again, or type your answer.');
        },
      });
    } catch (e) {
      this.practiceListening.set(false);
      this.addPractice('lela', e instanceof Error ? e.message : 'Microphone unavailable.');
    }
  }

  stopAll(): void {
    if (this.lela.sessionMode() && this.practiceMode() === 'chat') {
      // Voice Session Stop: Lela and the microphone stop now, no automatic restart, the microphone stays OFF.
      this.lela.stopSession();
      this.headerMode.set('manual');
      return;
    }
    if (this.paraListening()) { this.stopParagraphMic(); this.lela.stopSpeaking(); return; }
    if (this.practiceListening()) {
      this.lela.speech.stopListening();
      this.lela.stopSpeaking();
      return;
    }
    if (this.lela.phase() === 'listening') {
      this.lela.setAutoListen(false);
      this.headerMode.set('manual');
      this.lela.tapMic();
      return;
    }
    this.lela.stopSpeaking();
    this.lela.setAutoListen(false);
    this.lela.setMicOn(false);
    this.lela.setLiveMode(false);
    this.headerMode.set('manual');
  }

  checkPracticeAnswer(answer: string): void {
    switch (this.practiceMode()) {
      case 'tamil': void this.checkTamil(answer); break;
      case 'tenses': void this.checkTense(answer); break;
      case 'preposition': this.checkPreposition(answer); break;
      case 'fillBlank': this.checkFillBlank(answer); break;
      default: void this.lela.submit(answer, 'typed');
    }
  }

  // ===== Practice plumbing =====

  private addPractice(from: 'lela' | 'user', text: string, extra: Partial<PracticeMessage> = {}): void {
    this.practiceMessages.update((list) => [...list, { id: this.nextId++, from, text, ...extra }]);
  }

  private speakPractice(text: string): void {
    if (this.lela.voiceOn() && text && !/[஀-௿]/.test(text)) this.lela.playSample(text);
  }

  private autoNext(next: () => void): void {
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => { this.questionAnswered.set(false); next(); }, 2600);
  }

  private resetPractice(mode: PracticeKind): void {
    clearTimeout(this.autoTimer);
    this.practiceMode.set(mode);
    this.practiceMessages.set([]);
    this.savePracticeProgress();
    this.questionAnswered.set(false);
    this.topicOpen.set(false);
    this.practiceSub?.unsubscribe();
    this.practiceListening.set(false);
    this.stopParagraphMic();
    if (this.practiceMode() !== mode || mode === 'tamil' || mode === 'tenses') { /* keep the session results while the learner stays in the same exercise */ }
    if (mode !== 'chat') {
      this.lela.endSession();
      this.lela.pause();
      this.lela.setAutoListen(false);
      this.lela.setMicOn(false);
      this.lela.setLiveMode(false);
    }
  }

  /** Leaves an exercise and shows the normal conversation again (nothing is restarted). */
  private endExercise(): void {
    clearTimeout(this.autoTimer);
    this.practiceSub?.unsubscribe();
    this.practiceListening.set(false);
    this.stopParagraphMic();
    this.tamilKind.set('sentence');
    this.practiceStats.set({});
    this.paraTotals.set(null);
    this.practiceMode.set('chat');
    this.practiceMessages.set([]);
    this.questionAnswered.set(false);
    this.savePracticeProgress();
  }

  // ===== Tamil → English =====

  startTamil(topic: string): void {
    this.practiceMenuOpen.set(false);
    void this.loadPracticeSentenceLibrary();
    this.savePracticeProgress();
    this.stopParagraphMic();
    this.tamilKind.set('sentence');
    this.resetPractice('tamil');
    this.translationTopic.set(topic);
    this.tamilOrder = this.translationPool(topic).map((_, i) => i);
    this.tamilPos = Math.min(this.translationPositions[topic] ?? 0, Math.max(0, this.tamilOrder.length - 1));
    this.lastTamilTa = '';
    this.askTamil('Translate this Tamil sentence into English:');
    this.savePracticeProgress();
  }

  private currentTamil(): TranslationItem | undefined {
    return this.translationPool()[this.tamilOrder[this.tamilPos]];
  }

  private askTamil(intro: string): void {
    const item = this.currentTamil();
    if (!item) { this.addPractice('lela', 'There are no sentences in this topic yet.'); return; }
    this.lastTamilTa = item.ta;
    this.questionAnswered.set(false);
    this.addPractice('lela', `${intro}\n\n${item.ta}`, { speak: 'Translate this Tamil sentence into English.' });
    this.speakPractice('Translate this Tamil sentence into English.');
  }

  previousTamilQuestion(): void {
    if (this.tamilPos <= 0) return;
    this.tamilPos--; this.practiceMessages.set([]); this.askTamil('Previous Tamil sentence:'); this.savePracticeProgress();
  }

  nextTamilQuestion(): void {
    if (this.tamilPos >= this.tamilOrder.length - 1) return;
    this.tamilPos++; this.practiceMessages.set([]); this.askTamil('Next Tamil sentence:'); this.savePracticeProgress();
  }

  /** Tamil → English Sentence Practice. Any natural, correct translation is accepted; the whole sentence is checked. */
  private async checkTamil(answer: string): Promise<void> {
    if (this.questionAnswered()) return;
    const item = this.currentTamil();
    if (!item) return;
    this.questionAnswered.set(true);
    const label = this.takeLabel();
    const said = answer.trim();
    this.addPractice('user', said);
    let base: string | undefined;
    try { base = (await this.corrector.correct(said)).corrected; } catch { base = undefined; }
    const v = checkTranslation(said, item.answers.map(pretty), base);
    const fix: CorrectionCard = { label, said, mistakes: v.mistakes.map(lineFor), corrected: v.corrected, ok: v.ok };
    this.addPractice('lela', v.ok ? 'Excellent! அருமை!' : 'Good try! சரியான பதிலைப் பாருங்கள்.', { fix, notes: [item.note], tamilExplain: this.tamilNote(item.note) });
    this.recordStats('tamil-sentence', 1, v.ok ? 1 : 0, v.mistakes.length);
    this.savePracticeProgress();
  }

  private takeLabel(): 'wrote' | 'said' {
    const l = this.answerFromMic ? 'said' : 'wrote';
    this.answerFromMic = false;
    return l;
  }

  private recordStats(key: string, total: number, correct: number, mistakes: number): void {
    this.practiceStats.update((all) => {
      const cur = all[key] ?? { total: 0, correct: 0, mistakes: 0 };
      return { ...all, [key]: { total: cur.total + total, correct: cur.correct + correct, mistakes: cur.mistakes + mistakes } };
    });
  }

  // ===== Tamil → English: Paragraph Practice (inside the same session) =====

  setTamilKind(kind: 'sentence' | 'paragraph'): void {
    if (this.tamilKind() === kind) return;
    this.practiceSub?.unsubscribe();
    this.practiceListening.set(false);
    this.lela.speech.stopListening();
    this.lela.stopSpeaking();
    this.stopParagraphMic();
    this.tamilKind.set(kind);
    if (kind === 'paragraph') { void this.loadParagraphs(); this.clearParagraph(); }
  }

  setParagraphLevel(level: string): void {
    if (!PARAGRAPH_LEVELS.includes(level as ParagraphLevel)) return;
    this.paragraphLevel.set(level as ParagraphLevel);
    this.paraPos.set(0);
    this.clearParagraph();
  }

  private async loadParagraphs(): Promise<void> {
    if (this.paragraphs().length || this.paragraphsLoading()) return;
    this.paragraphsLoading.set(true);
    this.paragraphError.set('');
    try {
      const list = sanitiseParagraphs(await firstValueFrom(this.http.get<unknown>(PARAGRAPH_DATA_URL)));
      if (!list.length) throw new Error('empty');
      this.paragraphs.set(list);
    } catch {
      this.paragraphError.set('The paragraphs could not be loaded. Please check that public/data/practice/tamil-paragraphs.json exists.');
    } finally {
      this.paragraphsLoading.set(false);
    }
  }

  /** Manual microphone for Paragraph Practice: what you say is added to the box. Nothing starts by itself. */
  async paragraphMic(): Promise<void> {
    if (this.paraListening() || this.paraResult()) return;
    this.lela.stopSpeaking();
    try {
      const permission = await this.lela.speech.requestMicPermission();
      if (permission === 'denied') throw new Error('Microphone permission is blocked. Allow it in app settings.');
      this.paraInterim.set('');
      this.paraListening.set(true);
      let heardFinal = false;
      this.paraSub = this.lela.speech.listen('en-IN').subscribe({
        next: (e) => {
          if (e.transcript) this.paraInterim.set(e.transcript);
          if (e.isFinal && e.transcript.trim() && !heardFinal) {
            heardFinal = true;
            const heard = e.transcript.trim();
            const before = this.paraAnswer().trim();
            const next = before ? `${before} ${heard}` : heard;
            // "said" only while every word in the box came from the microphone.
            this.paraSpokenSig.set(before && this.paraSpokenSig() !== before ? '' : next);
            this.paraAnswer.set(next);
            this.paraListening.set(false);
            this.paraSub?.unsubscribe();
            this.paraSub = null;
          }
        },
        error: (e) => {
          this.paraListening.set(false);
          this.paraSub = null;
          this.paragraphError.set(e instanceof Error ? e.message : 'Could not hear you. Please type your answer.');
        },
        complete: () => {
          const was = this.paraListening();
          this.paraListening.set(false);
          this.paraSub = null;
          if (was && !heardFinal) this.paragraphError.set('I could not hear you clearly. Please say it again, or type your answer.');
        },
      });
      this.paragraphError.set('');
    } catch (e) {
      this.paraListening.set(false);
      this.paragraphError.set(e instanceof Error ? e.message : 'Microphone unavailable.');
    }
  }

  stopParagraphMic(): void {
    if (this.paraSub) { this.lela.speech.stopListening(); this.paraSub.unsubscribe(); this.paraSub = null; }
    this.paraListening.set(false);
  }

  async submitParagraph(): Promise<void> {
    const item = this.currentParagraph();
    const text = this.paraAnswer().trim();
    if (!item || !text || this.paraResult() || this.paraChecking()) return;
    this.stopParagraphMic();
    this.paraChecking.set(true);
    try {
      const segments = segmentAnswer(item, text);
      const base = await Promise.all(segments.map(async (seg) => {
        if (!seg.trim()) return undefined;
        try { return (await this.corrector.correct(seg)).corrected; } catch { return undefined; }
      }));
      const result = evaluateSegments(item, segments, base);
      this.paraResult.set({ ...result, sentences: result.sentences.map((sr) => ({ ...sr, mistakeLines: sr.mistakes.map(lineFor) })) });
      const prev = this.paraTotals() ?? { paragraphs: 0, total: 0, correct: 0, mistakes: 0 };
      this.paraTotals.set({ paragraphs: prev.paragraphs + 1, total: prev.total + result.total, correct: prev.correct + result.correct, mistakes: prev.mistakes + result.mistakeCount });
    } finally {
      this.paraChecking.set(false);
    }
  }

  clearParagraph(): void {
    this.stopParagraphMic();
    this.paraAnswer.set('');
    this.paraSpokenSig.set('');
    this.paraInterim.set('');
    this.paraResult.set(null);
    this.paragraphError.set('');
  }

  nextParagraph(): void {
    const n = this.paraList().length;
    if (!n) return;
    this.paraPos.update((i) => (i + 1) % n);
    this.clearParagraph();
  }

  textValue(e: Event): string { return (e.target as HTMLTextAreaElement).value; }

  private tamilNote(note: string): string {
    const n = note.toLowerCase();
    if (n.includes('price')) return 'விலையைக் கேட்க “How much is…?” என்ற கேள்வி வடிவத்தைப் பயன்படுத்தவும்.';
    if (n.includes('polite') || n.includes('request')) return 'மரியாதையாகக் கேட்க “Could you…?” அல்லது “Would like” போன்ற சொற்களைப் பயன்படுத்தவும்.';
    if (n.includes('available')) return 'ஏதாவது கிடைக்கிறதா என்று கேட்க “Do you have…?” பயன்படுத்தவும்.';
    if (n.includes('try this on')) return 'உடை அணிந்து பொருத்தத்தைப் பார்க்க “try this on” என்று சொல்வோம்.';
    if (n.includes('simple present') || n.includes('daily habits')) return 'தினசரி பழக்கங்கள் மற்றும் வழக்கமான செயல்களுக்கு Simple Present பயன்படுத்தவும்.';
    if (n.includes('present continuous')) return 'இப்போது நடந்து கொண்டிருக்கும் செயலுக்கு am/is/are + verb-ing பயன்படுத்தவும்.';
    if (n.includes('past')) return 'கடந்த காலத்தில் நடந்த செயலுக்கு வினைச்சொல்லின் Past வடிவத்தைப் பயன்படுத்தவும்.';
    if (n.includes('future') || n.includes('will')) return 'எதிர்காலச் செயலைக் கூற “will” பயன்படுத்தவும்.';
    if (n.includes('where is')) return 'ஒரு இடத்தைப் பற்றி கேட்க “Where is…?” என்ற கேள்வி வடிவத்தைப் பயன்படுத்தவும்.';
    if (n.includes('experience')) return 'உங்கள் பணிப் பின்னணியைச் சொல்ல “I have … years of experience” என்ற வடிவத்தைப் பயன்படுத்தவும்.';
    if (n.includes('book a room')) return 'ஹோட்டலில் அறை முன்பதிவு செய்ய “book a room” என்று கூறலாம்.';
    if (n.includes('included')) return 'விலையில் ஏதாவது சேர்க்கப்பட்டுள்ளதா என்று கேட்க “included” பயன்படுத்தவும்.';
    if (n.includes('check out')) return 'ஹோட்டலை விட்டு வெளியேறும் நேரத்தைக் கேட்க “check out” பயன்படுத்தவும்.';
    if (n.includes('table for two')) return 'இரண்டு பேருக்கான மேசையைக் கேட்க “a table for two” என்று கூறவும்.';
    if (n.includes('vegetarian')) return 'சைவ உணவு கிடைக்கிறதா என்று கேட்க “Do you have vegetarian food?” பயன்படுத்தவும்.';
    if (n.includes('bill')) return 'உணவகத்தில் கணக்கைக் கேட்க “Could I have the bill?” என்று மரியாதையாகக் கேட்கலாம்.';
    if (n.includes('telephone') || n.includes('speak to')) return 'தொலைபேசியில் ஒருவருடன் பேச அனுமதி கேட்க “May I speak to…?” பயன்படுத்தவும்.';
    if (n.includes('suggestion')) return 'நட்பாக ஒரு யோசனை சொல்ல “Shall we…?” பயன்படுத்தவும்.';
    if (n.includes('planned activity')) return 'திட்டமிட்ட செயலைப் பற்றி கேட்க Present Continuous பயன்படுத்தவும்.';
    if (n.includes('how are you feeling')) return 'ஒருவரின் நலம் பற்றி கேட்க “How are you feeling?” பயன்படுத்தவும்.';
    return 'இந்த வாக்கியத்தின் பொருளையும் சரியான ஆங்கிலச் சொல் வரிசையையும் கவனித்து மீண்டும் பயிற்சி செய்யுங்கள்.';
  }

  // ===== Tenses =====

  private get tenseLesson() {
    return TENSE_LESSONS.find(l => l.id === (this.selectedTense() as TenseId)) ?? TENSE_LESSONS[0];
  }

  /** Draws message specs from the practice engine with the chat's existing bubbles. */
  private addSpecs(specs: MessageSpec[]): void {
    for (const m of specs) {
      const { from, text, ...extra } = m;
      this.addPractice(from, text, extra);
    }
  }

  startTenses(): void {
    this.practiceMenuOpen.set(false);
    void this.loadPracticeSentenceLibrary();
    this.resetPractice('tenses');
    void this.loadTenseLessons();
    this.showTenseLesson();
  }

  async selectTense(id: string): Promise<void> {
    clearTimeout(this.autoTimer);
    this.savePracticeProgress();
    this.selectedTense.set(id);
    this.showTenseLesson();
    if (this.tenses.some(item => item.id === id)) void this.loadOnlineTensePool(id as TenseId);
  }

  /** Manually fetches free, attributed examples classified for the currently selected tense. */
  async fetchFreeOnlineTenseSentences(): Promise<void> {
    if (this.onlineSentenceLoading()) return;
    if (!this.online()) { this.onlineSentenceStatus.set('Connect to the internet to fetch free tense examples.'); return; }
    this.onlineSentenceLoading.set(true);
    this.onlineSentenceStatus.set(`Checking free ${this.selectedTenseInfo().name} examples…`);
    try {
      const added = await this.loadOnlineTensePool(this.selectedTense() as TenseId, true);
      this.onlineSentenceStatus.set(added >= 50 ? `50 new ${this.selectedTenseInfo().name} sentences added to this session.` : added ? `Added ${added} new ${this.selectedTenseInfo().name} sentences (50 requested). The free source did not provide 50 more matching Tamil translations this time.` : `No new matching ${this.selectedTenseInfo().name} sentences were available. Your saved examples are still available offline.`);
    } finally { this.onlineSentenceLoading.set(false); }
  }

  /** Adds approved online examples for the selected tense without interrupting the current lesson. */
  private async loadOnlineTensePool(id: TenseId, force = false): Promise<number> {
    const online = await this.onlineSentenceLibrary.syncForTense(id, force);
    if (!online.length) return 0;
    const current = this.tenseTamilPools()[id] ?? [];
    const seen = new Set(current.map(item => item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '')));
    const additions: TenseTamilItem[] = online.map(sentence => ({
      ta: sentence.tamil, model: sentence.en,
      keys: [...new Set(sentence.en.toLocaleLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(word => word.length > 2).map(word => word.slice(0, 4)))].slice(0, 8),
      ...(sentence.sourceAttribution ? { note: `Source: ${sentence.sourceAttribution.source} · Licence: ${sentence.sourceAttribution.license} · Licence details: ${sentence.sourceAttribution.licenseUrl} · ${sentence.sourceAttribution.url}` } : {}),
    })).filter(item => {
      const key = item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
    if (!additions.length) return 0;
    this.tenseTamilPools.update(pools => ({ ...pools, [id]: [...(pools[id] ?? []), ...additions] }));
    // Tense-specific online additions are also available in the general Tamil-to-English topic pool.
    this.translationPools.update(pools => {
      const currentItems = pools['Daily life'] ?? [];
      const tamilSeen = new Set(currentItems.map(item => item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '')));
      const newItems: TranslationItem[] = online.map(sentence => ({
        ta: sentence.tamil, answers: [sentence.en],
        note: sentence.sourceAttribution ? `Source: ${sentence.sourceAttribution.source} · Licence: ${sentence.sourceAttribution.license} · Licence details: ${sentence.sourceAttribution.licenseUrl} · ${sentence.sourceAttribution.url}` : 'Online community sentence.',
      })).filter(item => {
        const key = item.ta.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}]/gu, '');
        if (!key || tamilSeen.has(key)) return false;
        tamilSeen.add(key); return true;
      });
      return { ...pools, 'Daily life': [...currentItems, ...newItems] };
    });
    // If the learner selected practice before the network response arrived, extend the session order safely.
    if (this.practiceMode() === 'tenses' && this.selectedTense() === id) {
      const size = this.tenseMode() === 'english' ? this.currentTenseEnglishPrompts().length
        : this.tenseMode() === 'tamil' ? this.currentTenseTamilItems().length : 0;
      if (size > this.tenseOrder.length) this.tenseOrder = [...this.tenseOrder, ...Array.from({ length: size - this.tenseOrder.length }, (_, index) => this.tenseOrder.length + index)];
    }
    return additions.length;
  }

  /** Syntax, positive / negative / question, usage and all six examples with Tamil, then "How would you like to practise?". */
  private showTenseLesson(): void {
    clearTimeout(this.autoTimer);
    this.practiceMessages.set([]);
    this.questionAnswered.set(false);
    this.tenseMode.set('ask');
    this.tenseLessonShown.set(true);
    this.addSpecs(tenseLessonMessages(this.tenseLesson));
    this.speakPractice(`${this.tenseLesson.name}. ${this.tenseLesson.structure}. How would you like to practise?`);
    this.savePracticeProgress();
  }

  chooseTenseMode(mode: 'english' | 'tamil'): void {
    if (this.tenseMode() !== 'ask') return;
    this.addPractice('user', mode === 'english' ? 'English Practice' : 'Tamil to English Practice');
    this.tenseMode.set(mode);
    const size = mode === 'english' ? this.currentTenseEnglishPrompts().length : this.currentTenseTamilItems().length;
    const expected = Array.from({ length: size }, (_, i) => i);
    if (this.tenseOrder.length !== size || this.tenseOrder.some((v, i) => v !== expected[i])) this.tenseOrder = expected;
    const savedPosition = this.tensePositions[this.selectedTense()]?.[mode];
    const position = typeof savedPosition === 'number' && Number.isFinite(savedPosition) ? savedPosition : 0;
    this.tensePos = Math.min(position, Math.max(0, size - 1));
    this.askTense();
    this.savePracticeProgress();
  }

  private currentTenseTamil(): TenseTamilItem | undefined {
    return this.currentTenseTamilItems()[this.tenseOrder[this.tensePos]];
  }

  private askTense(): void {
    this.questionAnswered.set(false);
    const lesson = this.tenseLesson;
    if (this.tenseMode() === 'english') {
      const prompt = this.currentTenseEnglishPrompts()[this.tenseOrder[this.tensePos]];
      this.addSpecs([tenseEnglishPromptMessage(lesson, prompt)]);
      this.speakPractice(prompt);
    } else {
      const item = this.currentTenseTamil();
      if (!item) return;
      this.addSpecs([tenseTamilPromptMessage(item)]);
      this.speakPractice('Translate this Tamil sentence into English.');
    }
  }

  previousTenseQuestion(): void {
    if (this.tensePos <= 0 || !this.tenseOrder.length) return;
    this.tensePos--; this.practiceMessages.set([]); this.askTense(); this.savePracticeProgress();
  }

  nextTenseQuestion(): void {
    if (this.tensePos >= this.tenseOrder.length - 1 || !this.tenseOrder.length) return;
    this.tensePos++; this.practiceMessages.set([]); this.askTense(); this.savePracticeProgress();
  }

  private async checkTense(answer: string): Promise<void> {
    const clean = answer.trim();
    if (!clean) return;
    if (this.tenseMode() === 'ask') {
      this.addPractice('user', clean);
      const mode = parseTenseModeChoice(clean);
      if (mode) {
        this.practiceMessages.update(l => l.slice(0, -1));
        if (mode === 'fillBlank') this.chooseFillBlankPractice();
        else { this.tenseMode.set('ask'); this.chooseTenseMode(mode); }
      } else this.addPractice('lela', 'Please choose English Practice (1), Tamil to English Practice (2), or Fill in the Blank (3).');
      return;
    }
    if (this.questionAnswered()) return;
    this.questionAnswered.set(true);
    const label = this.takeLabel();
    this.addPractice('user', clean);
    const lesson = this.tenseLesson;
    const outcome = await this.corrector.correct(clean);
    const result = this.tenseMode() === 'english'
      ? checkTenseEnglish(clean, lesson, outcome, label)
      : checkTenseTamil(clean, lesson, this.currentTenseTamil() ?? this.currentTenseTamilItems()[0], outcome, label);
    this.addSpecs(result.messages);
    if (result.clarify) { this.questionAnswered.set(false); return; }
    this.recordStats('tense', 1, result.grammarOk && result.tenseOk ? 1 : 0, result.mistakeCount);
    this.speakPractice(result.messages[0]?.speak ?? '');
    this.savePracticeProgress();
  }

  // ===== Fill in the Blank =====

  chooseFillBlankPractice(): void {
    if (this.tenseMode() !== 'ask') return;
    this.addPractice('user', 'Fill in the Blank');
    this.practiceMode.set('fillBlank');
    this.tenseMode.set('ask');
    this.practiceMessages.set([]);
    this.fillOptionsShown.set(false);
    this.askFillBlankQuestion();
    this.savePracticeProgress();
  }

  private askFillBlankQuestion(): void {
    const q = this.currentFillBlank();
    if (!q) return;
    this.fillOptionsShown.set(false);
    const alreadySolved = this.fillBlankCorrectIds().includes(q.id);
    this.fillBlankSolved.set(alreadySolved);
    this.fillBlankLastAnswer.set(alreadySolved ? q.answers[0] : '');
    this.questionAnswered.set(alreadySolved);
    this.addPractice('lela', q.blank, { tamil: q.ta, notes: [`${BLANK_CATEGORY_LABEL[q.category]} · Type the missing word, or tap Show Options.`], speak: q.blank.replace('____', 'blank') });
    this.speakPractice(q.blank.replace('____', 'blank'));
  }

  toggleFillOptions(): void { this.fillOptionsShown.update(v => !v); }

  answerFillBlank(answer: string): void { this.checkFillBlank(answer); }

  private checkFillBlank(answer: string): void {
    const q = this.currentFillBlank();
    const typed = answer.trim();
    if (!q || !typed || this.fillBlankSolved()) return;
    this.fillBlankLastAnswer.set(typed);
    this.addPractice('user', typed);
    const correct = isBlankAnswerCorrect(typed, q);
    if (correct) {
      this.fillBlankSolved.set(true);
      if (!this.fillBlankCorrectIds().includes(q.id)) {
        this.fillBlankCorrectIds.update(ids => [...ids, q.id]);
        this.fillBlankScore.set(this.fillBlankCorrectIds().length);
      }
      this.addPractice('lela', 'Correct! நன்று!', { boxLabel: 'Complete sentence:', box: q.full, boxOk: true, notes: [q.explain], tamilExplain: q.explainTa });
      this.questionAnswered.set(true);
    } else {
      this.addPractice('lela', 'Try Again. மீண்டும் முயற்சி செய்யுங்கள்.', { boxLabel: 'Hint:', box: 'Read the sentence and Tamil meaning. You can try another answer.', boxOk: false });
      this.questionAnswered.set(false);
    }
    this.savePracticeProgress();
  }

  previousFillBlankQuestion(): void {
    if (this.fillBlankIndex() <= 0) return;
    this.fillBlankIndex.update(n => n - 1);
    this.practiceMessages.set([]); this.askFillBlankQuestion(); this.savePracticeProgress();
  }

  nextFillBlankQuestion(): void {
    if (this.fillBlankIndex() >= this.blankQuestions.length - 1) return;
    this.fillBlankIndex.update(n => n + 1);
    this.practiceMessages.set([]); this.askFillBlankQuestion(); this.savePracticeProgress();
  }

  // ===== Prepositions =====

  async startPrepositions(): Promise<void> {
    this.menuOpen.set(false);
    this.resetPractice('preposition');
    this.selectedPreposition.set('');
    this.practiceMenuOpen.set(true);
    this.prepQuestionList.set([]);
    this.addPractice('lela', 'Choose a preposition from the list. I will explain it and show English and Tamil examples. Then you will practise with questions from all prepositions.');
    // The built-in lessons are already in the list. The optional data file only adds extra words, and may be missing.
    try {
      const extra = await firstValueFrom(this.http.get<PrepItem[]>('data/prepositions-500.json'));
      this.prepLessons.set(mergeExtraPrepositions(PREPOSITION_LESSONS, extra));
    } catch {
      this.prepLessons.set(PREPOSITION_LESSONS);
    }
  }

  selectPreposition(word: string): void {
    clearTimeout(this.autoTimer);
    if (word) this.practiceMenuOpen.set(false);
    this.selectedPreposition.set(word);
    this.prepIndex.set(0);
    this.practiceMessages.set([]);
    this.questionAnswered.set(false);
    const lesson = this.selectedPrepositionLesson();
    if (!word || !lesson) { this.prepQuestionList.set([]); return; }
    this.prepQuestionList.set(shuffle(allPrepositionQuestions(this.prepLessons())));
    this.addSpecs(prepositionLessonMessages(lesson));
    this.speakPractice(`${lesson.word}. ${lesson.usage}`);
    if (this.prepQuestionList().length) this.askPreposition();
    else this.addPractice('lela', 'There are no practice questions for this word yet.');
  }

  private askPreposition(): void {
    const q = this.currentPreposition();
    if (!q) return;
    this.questionAnswered.set(false);
    this.addSpecs([prepositionQuestionMessage(q)]);
    this.speakPractice(`Choose the correct preposition. ${q.blank.replace('____', '...')}`);
  }

  private checkPreposition(answer: string): void {
    const selectedLesson = this.selectedPrepositionLesson();
    if (!selectedLesson) { this.addPractice('lela', 'Please choose a preposition from the list first.'); return; }
    if (this.questionAnswered()) return;
    const q = this.currentPreposition();
    if (!q || !answer.trim()) return;
    const questionLesson = this.prepLessons().find(item => item.word === q.lessonWord) ?? selectedLesson;
    this.questionAnswered.set(true);
    this.addPractice('user', answer.trim());
    const result = checkPrepositionAnswer(answer, q, questionLesson);
    this.addSpecs(result.messages);
    this.speakPractice(q.full);
    this.autoNext(() => {
      this.prepIndex.update((n) => (n + 1) % Math.max(1, this.prepQuestionList().length));
      this.askPreposition();
    });
  }

  // ===== Toolbar =====

  toggleTopic(): void { this.topicOpen.update((v) => !v); }
  /** The Practice button shows only while a Tamil → English, Tenses or Preposition session is running. */
  hasPracticeMenu(): boolean { const m = this.practiceMode(); return m === 'tamil' || m === 'tenses' || m === 'preposition'; }
  togglePracticeMenu(): void { this.practiceMenuOpen.update((v) => !v); }
  closePracticeMenu(): void { this.practiceMenuOpen.set(false); }
  private syncTopbarHeight(): void {
    const bar = this.host.nativeElement.querySelector('.topbar') as HTMLElement | null;
    if (bar) this.host.nativeElement.style.setProperty('--topbar-h', `${bar.offsetHeight - 6}px`);
  }
  @HostListener('window:resize') onResizeSyncMenu(): void { if (this.practiceMenuOpen()) this.syncTopbarHeight(); }

  pickTopic(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.topicOpen.set(false);
    if (this.practiceMode() !== 'chat') this.endExercise();
    if (id === '__next') void this.lela.changeTopic();
    else if (id) void this.lela.goToTopic(id);
  }

  setInterview(): void {
    this.resetPractice('chat');
    this.lela.endSession();
    if (isVoiceSession(this.headerMode())) this.headerMode.set('manual');
    this.lela.setAutoListen(false);
    this.lela.setMicOn(false);
    this.lela.setLiveMode(false);
    this.lela.setMode('interview');
  }

  /** Daily Practice never listens by itself: the Voice Session is closed first. */
  setDaily(): void {
    this.resetPractice('chat');
    this.lela.endSession();
    if (isVoiceSession(this.headerMode())) this.headerMode.set('manual');
    void this.lela.newConversation('daily');
  }

  endPractice(): void {
    this.practiceMenuOpen.set(false);
    clearTimeout(this.autoTimer);
    const wasChat = this.practiceMode() === 'chat';
    this.endExercise();
    if (wasChat && this.lela.active()) {
      void this.lela.end();
    } else {
      this.lela.setAutoListen(false);
      this.lela.setMicOn(false);
      this.lela.setLiveMode(false);
    }
  }

  // ===== Template helpers =====

  scrollDown(): void {
    const el = this.scrollBox?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  checked(e: Event): boolean { return (e.target as HTMLInputElement).checked; }
  inputValue(e: Event): string { return (e.target as HTMLInputElement).value; }
  valueOf(e: Event): string { return (e.target as HTMLSelectElement).value; }
  numberValue(e: Event): number { return Number((e.target as HTMLInputElement).value); }

  dateLabel(h: SavedConversation): string {
    const d = new Date(h.date);
    return Number.isNaN(d.getTime()) ? 'Earlier' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
