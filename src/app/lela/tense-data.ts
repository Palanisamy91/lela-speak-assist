// Lessons and practice material for the 12 English tenses (English + Tamil). Pure data, no Angular.
// Every tense has: structure, positive / negative / question forms, SIX examples with Tamil meanings, when to use it,
// English practice instructions and Tamil sentences with a model translation.

export type TenseId =
  | 'present-simple' | 'present-continuous' | 'present-perfect' | 'present-perfect-continuous'
  | 'past-simple' | 'past-continuous' | 'past-perfect' | 'past-perfect-continuous'
  | 'future-simple' | 'future-continuous' | 'future-perfect' | 'future-perfect-continuous';

export interface TenseExample { en: string; ta: string }
export interface TenseTamilItem {
  ta: string;
  /** A model translation in the right tense. Other correct translations are accepted. */
  model: string;
  /** Word stems (first letters of the important English words) used only to say whether the meaning looks the same. */
  keys: string[];
  /** Source credit for externally supplied practice sentences. */
  note?: string;
}
export interface TenseLesson {
  id: TenseId;
  name: string;
  structure: string;
  positive: string;
  negative: string;
  question: string;
  usage: string;
  usageTa: string;
  examples: TenseExample[];
  /** English Practice: an instruction asking for ONE sentence in this tense. */
  prompts: string[];
  /** Tamil to English Practice. */
  tamil: TenseTamilItem[];
}

const x = (en: string, ta: string): TenseExample => ({ en, ta });
const t = (ta: string, model: string, keys: string[]): TenseTamilItem => ({ ta, model, keys });

export const TENSE_LESSONS: TenseLesson[] = [
  {
    id: 'present-simple', name: 'Present Simple',
    structure: 'Subject + base verb (add s/es for he, she, it)',
    positive: 'Subject + verb(s/es) + object — She drinks tea.',
    negative: 'Subject + do/does + not + base verb — She does not drink tea.',
    question: 'Do/Does + subject + base verb + ? — Does she drink tea?',
    usage: 'Use it for daily habits, routines, facts and fixed schedules.',
    usageTa: 'தினசரிப் பழக்கங்கள், வழக்கமான செயல்கள், உண்மைகள், நிர்ணயிக்கப்பட்ட அட்டவணைகளுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I wake up at six every morning.', 'நான் தினமும் காலை ஆறு மணிக்கு எழுகிறேன்.'),
      x('She drinks tea in the evening.', 'அவள் மாலையில் தேநீர் குடிக்கிறாள்.'),
      x('The sun rises in the east.', 'சூரியன் கிழக்கில் உதிக்கிறது.'),
      x('My brother works in a bank.', 'என் அண்ணன் ஒரு வங்கியில் வேலை செய்கிறான்.'),
      x('We do not eat meat on Fridays.', 'நாங்கள் வெள்ளிக்கிழமைகளில் இறைச்சி சாப்பிடுவதில்லை.'),
      x('Does your bus leave at eight?', 'உங்கள் பேருந்து எட்டு மணிக்குப் புறப்படுமா?'),
    ],
    prompts: [
      'Write one sentence about what you do every morning.',
      'Write one sentence about your favourite food. Use the present simple.',
      'Write one sentence about a fact about your city.',
      'Write one negative sentence about something you do not do on Sundays.',
      'Write one question to ask a friend about his or her daily routine.',
      'Write one sentence about what your father or mother does every day.',
    ],
    tamil: [
      t('நான் தினமும் காலையில் தேநீர் குடிக்கிறேன்.', 'I drink tea every morning.', ['drin', 'tea', 'morn']),
      t('அவள் ஒரு பள்ளியில் வேலை செய்கிறாள்.', 'She works in a school.', ['work', 'scho']),
      t('என் அப்பா தினமும் செய்தித்தாள் படிக்கிறார்.', 'My father reads the newspaper every day.', ['fath', 'read', 'news']),
      t('நாங்கள் ஞாயிற்றுக்கிழமை வேலை செய்வதில்லை.', 'We do not work on Sundays.', ['work', 'sund']),
      t('அவன் கிரிக்கெட் விளையாடுவானா?', 'Does he play cricket?', ['play', 'cric']),
      t('தண்ணீர் நூறு டிகிரியில் கொதிக்கும்.', 'Water boils at one hundred degrees.', ['wate', 'boil', 'hund']),
    ],
  },
  {
    id: 'present-continuous', name: 'Present Continuous',
    structure: 'Subject + am/is/are + verb-ing',
    positive: 'Subject + am/is/are + verb-ing — I am cooking now.',
    negative: 'Subject + am/is/are + not + verb-ing — I am not cooking now.',
    question: 'Am/Is/Are + subject + verb-ing + ? — Are you cooking now?',
    usage: 'Use it for actions happening now, temporary situations, and fixed plans in the near future.',
    usageTa: 'இப்போது நடந்துகொண்டிருக்கும் செயல்கள், தற்காலிக நிலைகள், அருகிலுள்ள உறுதியான திட்டங்களுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I am writing an email now.', 'நான் இப்போது ஒரு மின்னஞ்சல் எழுதிக்கொண்டிருக்கிறேன்.'),
      x('She is cooking dinner.', 'அவள் இரவு உணவு சமைத்துக்கொண்டிருக்கிறாள்.'),
      x('They are playing in the garden.', 'அவர்கள் தோட்டத்தில் விளையாடிக்கொண்டிருக்கிறார்கள்.'),
      x('It is raining outside.', 'வெளியே மழை பெய்துகொண்டிருக்கிறது.'),
      x('We are not watching television.', 'நாங்கள் தொலைக்காட்சி பார்த்துக்கொண்டிருக்கவில்லை.'),
      x('Are you coming to the party tomorrow?', 'நீங்கள் நாளை விருந்துக்கு வருகிறீர்களா?'),
    ],
    prompts: [
      'Write one sentence about what you are doing right now.',
      'Write one sentence about what your friend is doing now.',
      'Write one negative sentence about something you are not doing now.',
      'Write one question to ask someone what he or she is doing.',
      'Write one sentence about the weather right now.',
      'Write one sentence about a plan you have for tomorrow. Use the present continuous.',
    ],
    tamil: [
      t('நான் இப்போது படித்துக்கொண்டிருக்கிறேன்.', 'I am studying now.', ['stud', 'now']),
      t('அவள் சமையலறையில் சமைத்துக்கொண்டிருக்கிறாள்.', 'She is cooking in the kitchen.', ['cook', 'kitc']),
      t('குழந்தைகள் பூங்காவில் விளையாடிக்கொண்டிருக்கிறார்கள்.', 'The children are playing in the park.', ['chil', 'play', 'park']),
      t('நாங்கள் இப்போது தொலைக்காட்சி பார்க்கவில்லை.', 'We are not watching television now.', ['watc', 'tele', 'now']),
      t('நீ என்ன செய்துகொண்டிருக்கிறாய்?', 'What are you doing?', ['what', 'doin']),
      t('நான் நாளை என் நண்பனைச் சந்திக்கிறேன்.', 'I am meeting my friend tomorrow.', ['meet', 'frie', 'tomo']),
    ],
  },
  {
    id: 'present-perfect', name: 'Present Perfect',
    structure: 'Subject + have/has + past participle',
    positive: 'Subject + have/has + past participle — I have finished my work.',
    negative: 'Subject + have/has + not + past participle — I have not finished my work.',
    question: 'Have/Has + subject + past participle + ? — Have you finished your work?',
    usage: 'Use it for life experiences and for completed actions that matter now. Do not say the exact time (not "yesterday").',
    usageTa: 'வாழ்க்கை அனுபவங்கள், இப்போதும் முக்கியமான முடிந்த செயல்களுக்கு இதைப் பயன்படுத்துவோம். சரியான நேரத்தை (நேற்று) சொல்லக்கூடாது.',
    examples: [
      x('I have finished my homework.', 'நான் என் வீட்டுப்பாடத்தை முடித்துவிட்டேன்.'),
      x('She has visited Delhi twice.', 'அவள் டெல்லிக்கு இரண்டு முறை போயிருக்கிறாள்.'),
      x('We have lived here for five years.', 'நாங்கள் ஐந்து ஆண்டுகளாக இங்கு வசிக்கிறோம்.'),
      x('They have not arrived yet.', 'அவர்கள் இன்னும் வந்து சேரவில்லை.'),
      x('Have you ever eaten sushi?', 'நீங்கள் எப்போதாவது சுஷி சாப்பிட்டிருக்கிறீர்களா?'),
      x('He has lost his keys.', 'அவன் சாவிகளைத் தொலைத்துவிட்டான்.'),
    ],
    prompts: [
      'Write one sentence about something you have finished today.',
      'Write one sentence about a place you have visited.',
      'Write one negative sentence about something you have not done yet.',
      'Write one question starting with "Have you ever".',
      'Write one sentence about how long you have lived in your house or city.',
      'Write one sentence about something a friend has done recently.',
    ],
    tamil: [
      t('நான் என் வேலையை முடித்துவிட்டேன்.', 'I have finished my work.', ['fini', 'work']),
      t('அவள் சென்னைக்குப் பலமுறை போயிருக்கிறாள்.', 'She has visited Chennai many times.', ['visi', 'chen', 'many']),
      t('நாங்கள் இன்னும் சாப்பிடவில்லை.', 'We have not eaten yet.', ['eate', 'yet']),
      t('நீங்கள் இந்தப் படத்தைப் பார்த்திருக்கிறீர்களா?', 'Have you seen this film?', ['seen', 'film']),
      t('அவன் தன் பையைத் தொலைத்துவிட்டான்.', 'He has lost his bag.', ['lost', 'bag']),
      t('நான் பத்து ஆண்டுகளாக இங்கே வேலை செய்கிறேன்.', 'I have worked here for ten years.', ['work', 'here', 'ten']),
    ],
  },
  {
    id: 'present-perfect-continuous', name: 'Present Perfect Continuous',
    structure: 'Subject + have/has + been + verb-ing',
    positive: 'Subject + have/has + been + verb-ing — I have been studying for two hours.',
    negative: 'Subject + have/has + not + been + verb-ing — I have not been studying.',
    question: 'Have/Has + subject + been + verb-ing + ? — Have you been studying?',
    usage: 'Use it for an action that started in the past and is still going on, or has just stopped, and you stress how long.',
    usageTa: 'கடந்த காலத்தில் தொடங்கி இப்போதும் தொடரும் (அல்லது இப்போதுதான் நின்ற) செயலையும், எவ்வளவு நேரம் என்பதையும் சொல்ல இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I have been studying for two hours.', 'நான் இரண்டு மணி நேரமாகப் படித்துக்கொண்டிருக்கிறேன்.'),
      x('She has been working here since 2020.', 'அவள் 2020 முதல் இங்கு வேலை செய்துகொண்டிருக்கிறாள்.'),
      x('It has been raining all day.', 'நாள் முழுவதும் மழை பெய்துகொண்டிருக்கிறது.'),
      x('They have been waiting for the bus.', 'அவர்கள் பேருந்துக்காகக் காத்துக்கொண்டிருக்கிறார்கள்.'),
      x('We have not been sleeping well.', 'நாங்கள் சரியாகத் தூங்கவில்லை.'),
      x('How long have you been learning English?', 'நீங்கள் எவ்வளவு காலமாக ஆங்கிலம் கற்கிறீர்கள்?'),
    ],
    prompts: [
      'Write one sentence about something you have been doing for an hour.',
      'Write one sentence about how long you have been learning English.',
      'Write one sentence using "since" and the present perfect continuous.',
      'Write one negative sentence about something you have not been doing lately.',
      'Write one question starting with "How long have you been".',
      'Write one sentence about what a friend has been doing all day.',
    ],
    tamil: [
      t('நான் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருக்கிறேன்.', 'I have been waiting for an hour.', ['wait', 'hour']),
      t('அவள் காலையிலிருந்து படித்துக்கொண்டிருக்கிறாள்.', 'She has been studying since morning.', ['stud', 'morn']),
      t('நாங்கள் மூன்று ஆண்டுகளாக ஆங்கிலம் கற்றுக்கொண்டிருக்கிறோம்.', 'We have been learning English for three years.', ['lear', 'engl', 'thre']),
      t('நாள் முழுவதும் மழை பெய்துகொண்டிருக்கிறது.', 'It has been raining all day.', ['rain', 'all', 'day']),
      t('நீ எவ்வளவு நேரமாக வேலை செய்துகொண்டிருக்கிறாய்?', 'How long have you been working?', ['long', 'work']),
      t('அவன் இரண்டு மணி நேரமாகக் கிரிக்கெட் விளையாடிக்கொண்டிருக்கிறான்.', 'He has been playing cricket for two hours.', ['play', 'cric', 'two']),
    ],
  },
  {
    id: 'past-simple', name: 'Past Simple',
    structure: 'Subject + past form of the verb (verb + ed, or an irregular form)',
    positive: 'Subject + past verb — I visited my friend yesterday.',
    negative: 'Subject + did + not + base verb — I did not visit my friend.',
    question: 'Did + subject + base verb + ? — Did you visit your friend?',
    usage: 'Use it for actions that finished in the past, usually with a past time such as yesterday, last week or in 2019.',
    usageTa: 'கடந்த காலத்தில் முடிந்த செயல்களுக்கு (நேற்று, கடந்த வாரம், 2019-ல்) இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I visited my grandmother yesterday.', 'நான் நேற்று என் பாட்டியைப் பார்க்கச் சென்றேன்.'),
      x('She bought a new phone last week.', 'அவள் கடந்த வாரம் ஒரு புதிய தொலைபேசி வாங்கினாள்.'),
      x('We watched a film on Sunday.', 'நாங்கள் ஞாயிற்றுக்கிழமை ஒரு படம் பார்த்தோம்.'),
      x('He did not come to the party.', 'அவன் விருந்துக்கு வரவில்லை.'),
      x('They went to Madurai in 2019.', 'அவர்கள் 2019-ல் மதுரைக்குச் சென்றார்கள்.'),
      x('Did you call your mother last night?', 'நீங்கள் நேற்று இரவு உங்கள் அம்மாவுக்கு அழைத்தீர்களா?'),
    ],
    prompts: [
      'Write one sentence about what you did yesterday.',
      'Write one sentence about where you went last weekend.',
      'Write one negative sentence about something you did not do yesterday.',
      'Write one question starting with "Did you" about last night.',
      'Write one sentence about what you ate for breakfast today.',
      'Write one sentence about something you bought last month.',
    ],
    tamil: [
      t('நான் நேற்று என் நண்பனைச் சந்தித்தேன்.', 'I met my friend yesterday.', ['met', 'frie', 'yest']),
      t('அவள் கடந்த வாரம் சென்னைக்குச் சென்றாள்.', 'She went to Chennai last week.', ['went', 'chen', 'last']),
      t('நாங்கள் நேற்று இரவு படம் பார்த்தோம்.', 'We watched a film last night.', ['watc', 'film', 'nigh']),
      t('அவன் தேர்வில் தேர்ச்சி பெறவில்லை.', 'He did not pass the exam.', ['pass', 'exam']),
      t('நீ நேற்று பள்ளிக்குப் போனாயா?', 'Did you go to school yesterday?', ['go', 'scho', 'yest']),
      t('அவர்கள் புதிய வீடு வாங்கினார்கள்.', 'They bought a new house.', ['boug', 'new', 'hous']),
    ],
  },
  {
    id: 'past-continuous', name: 'Past Continuous',
    structure: 'Subject + was/were + verb-ing',
    positive: 'Subject + was/were + verb-ing — I was watching television at eight.',
    negative: 'Subject + was/were + not + verb-ing — I was not watching television.',
    question: 'Was/Were + subject + verb-ing + ? — Were you watching television?',
    usage: 'Use it for an action that was in progress at a time in the past, or for a longer action interrupted by a shorter one.',
    usageTa: 'கடந்த காலத்தில் ஒரு நேரத்தில் நடந்துகொண்டிருந்த செயல், அல்லது இடையில் வேறொரு செயலால் தடைபட்ட செயலுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I was watching television at eight.', 'எட்டு மணிக்கு நான் தொலைக்காட்சி பார்த்துக்கொண்டிருந்தேன்.'),
      x('She was cooking when I arrived.', 'நான் வந்தபோது அவள் சமைத்துக்கொண்டிருந்தாள்.'),
      x('They were playing football in the evening.', 'அவர்கள் மாலையில் கால்பந்து விளையாடிக்கொண்டிருந்தார்கள்.'),
      x('It was raining when we left.', 'நாங்கள் புறப்பட்டபோது மழை பெய்துகொண்டிருந்தது.'),
      x('He was not sleeping at midnight.', 'நள்ளிரவில் அவன் தூங்கிக்கொண்டிருக்கவில்லை.'),
      x('What were you doing at five o\'clock?', 'ஐந்து மணிக்கு நீங்கள் என்ன செய்துகொண்டிருந்தீர்கள்?'),
    ],
    prompts: [
      'Write one sentence about what you were doing at eight o\'clock last night.',
      'Write one sentence using "when": a longer action and a shorter action in the past.',
      'Write one sentence about what your family was doing yesterday evening.',
      'Write one negative sentence about something you were not doing.',
      'Write one question starting with "What were you doing".',
      'Write one sentence about the weather during your last trip.',
    ],
    tamil: [
      t('நான் நேற்று இரவு படித்துக்கொண்டிருந்தேன்.', 'I was studying last night.', ['stud', 'nigh']),
      t('அவள் சமைத்துக்கொண்டிருந்தபோது நான் வந்தேன்.', 'I arrived while she was cooking.', ['arri', 'cook']),
      t('அவர்கள் பூங்காவில் விளையாடிக்கொண்டிருந்தார்கள்.', 'They were playing in the park.', ['play', 'park']),
      t('நீ ஐந்து மணிக்கு என்ன செய்துகொண்டிருந்தாய்?', 'What were you doing at five o\'clock?', ['what', 'doin', 'five']),
      t('மழை பெய்துகொண்டிருந்தது.', 'It was raining.', ['rain']),
      t('நாங்கள் தொலைக்காட்சி பார்த்துக்கொண்டிருக்கவில்லை.', 'We were not watching television.', ['watc', 'tele']),
    ],
  },
  {
    id: 'past-perfect', name: 'Past Perfect',
    structure: 'Subject + had + past participle',
    positive: 'Subject + had + past participle — I had eaten before he arrived.',
    negative: 'Subject + had + not + past participle — I had not eaten before he arrived.',
    question: 'Had + subject + past participle + ? — Had you eaten before he arrived?',
    usage: 'Use it for an action that was finished before another action or time in the past.',
    usageTa: 'கடந்த காலத்தில் மற்றொரு செயல்/நேரத்துக்கு முன்பே முடிந்துவிட்ட செயலுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I had eaten before he arrived.', 'அவர் வருவதற்கு முன்பே நான் சாப்பிட்டிருந்தேன்.'),
      x('She had left when I called.', 'நான் அழைத்தபோது அவள் ஏற்கெனவே புறப்பட்டுவிட்டாள்.'),
      x('They had finished the work by noon.', 'அவர்கள் மதியத்துக்குள் வேலையை முடித்திருந்தார்கள்.'),
      x('We had not seen that film before.', 'நாங்கள் அந்தப் படத்தை முன்பு பார்த்திருக்கவில்லை.'),
      x('The train had already gone when we reached the station.', 'நாங்கள் நிலையம் அடைந்தபோது ரயில் ஏற்கெனவே சென்றுவிட்டது.'),
      x('Had you met him before the meeting?', 'கூட்டத்துக்கு முன் நீங்கள் அவரைச் சந்தித்திருந்தீர்களா?'),
    ],
    prompts: [
      'Write one sentence about something you had done before you left home today.',
      'Write one sentence using "before": two actions in the past. Use the past perfect for the first one.',
      'Write one sentence using "when" and the past perfect.',
      'Write one negative sentence about something you had not done before an event.',
      'Write one question starting with "Had you".',
      'Write one sentence about something that had already happened when you arrived somewhere.',
    ],
    tamil: [
      t('நான் அங்கு போவதற்கு முன்பே அவன் சென்றுவிட்டிருந்தான்.', 'He had left before I got there.', ['left', 'befo']),
      t('அவள் வருவதற்குள் நாங்கள் சாப்பிட்டிருந்தோம்.', 'We had eaten before she came.', ['eate', 'befo']),
      t('நான் நிலையம் அடைந்தபோது ரயில் சென்றுவிட்டிருந்தது.', 'The train had gone when I reached the station.', ['trai', 'gone', 'stat']),
      t('அவர்கள் வேலையை முடித்திருக்கவில்லை.', 'They had not finished the work.', ['fini', 'work']),
      t('நீ அந்தப் புத்தகத்தை முன்பே படித்திருந்தாயா?', 'Had you read that book before?', ['read', 'book']),
      t('மழை நின்றிருந்தது, அதனால் நாங்கள் வெளியே சென்றோம்.', 'The rain had stopped, so we went out.', ['rain', 'stop', 'went']),
    ],
  },
  {
    id: 'past-perfect-continuous', name: 'Past Perfect Continuous',
    structure: 'Subject + had + been + verb-ing',
    positive: 'Subject + had + been + verb-ing — I had been waiting for an hour.',
    negative: 'Subject + had + not + been + verb-ing — I had not been waiting long.',
    question: 'Had + subject + been + verb-ing + ? — Had you been waiting long?',
    usage: 'Use it for an action that continued for some time up to a point in the past.',
    usageTa: 'கடந்த காலத்தில் ஒரு புள்ளி வரை சிறிது நேரம் தொடர்ந்து நடந்த செயலுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I had been waiting for an hour when the bus came.', 'பேருந்து வந்தபோது நான் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருந்தேன்.'),
      x('She had been studying all night before the exam.', 'தேர்வுக்கு முன் அவள் இரவு முழுவதும் படித்துக்கொண்டிருந்தாள்.'),
      x('They had been living there for ten years.', 'அவர்கள் அங்கு பத்து ஆண்டுகளாக வசித்துக்கொண்டிருந்தார்கள்.'),
      x('It had been raining before we left.', 'நாங்கள் புறப்படுவதற்கு முன் மழை பெய்துகொண்டிருந்தது.'),
      x('He had not been sleeping well before the surgery.', 'அறுவை சிகிச்சைக்கு முன் அவன் சரியாகத் தூங்கிக்கொண்டிருக்கவில்லை.'),
      x('How long had you been working there?', 'நீங்கள் அங்கு எவ்வளவு காலமாக வேலை செய்துகொண்டிருந்தீர்கள்?'),
    ],
    prompts: [
      'Write one sentence about something you had been doing for a long time before a past event.',
      'Write one sentence using "for" and the past perfect continuous.',
      'Write one sentence about why someone was tired. Use the past perfect continuous.',
      'Write one negative sentence using "had not been".',
      'Write one question starting with "How long had you been".',
      'Write one sentence about the weather before you went out.',
    ],
    tamil: [
      t('நான் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருந்தேன்.', 'I had been waiting for an hour.', ['wait', 'hour']),
      t('அவள் இரவு முழுவதும் படித்துக்கொண்டிருந்ததால் களைப்பாக இருந்தாள்.', 'She was tired because she had been studying all night.', ['tire', 'stud', 'nigh']),
      t('நாங்கள் அங்கு ஐந்து ஆண்டுகளாக வசித்துக்கொண்டிருந்தோம்.', 'We had been living there for five years.', ['livi', 'five']),
      t('நீ எவ்வளவு நேரமாக ஓடிக்கொண்டிருந்தாய்?', 'How long had you been running?', ['long', 'runn']),
      t('மழை பெய்துகொண்டிருந்தது, அதனால் தரை ஈரமாக இருந்தது.', 'It had been raining, so the ground was wet.', ['rain', 'grou', 'wet']),
      t('அவன் வேலை செய்துகொண்டிருக்கவில்லை.', 'He had not been working.', ['work']),
    ],
  },
  {
    id: 'future-simple', name: 'Future Simple',
    structure: 'Subject + will + base verb',
    positive: 'Subject + will + base verb — I will call you tomorrow.',
    negative: 'Subject + will + not (won\'t) + base verb — I will not call you tomorrow.',
    question: 'Will + subject + base verb + ? — Will you call me tomorrow?',
    usage: 'Use it for future actions, quick decisions, promises and predictions. "Going to" is also used for plans.',
    usageTa: 'எதிர்காலச் செயல்கள், உடனடி முடிவுகள், வாக்குறுதிகள், கணிப்புகளுக்கு இதைப் பயன்படுத்துவோம். திட்டங்களுக்கு "going to" என்றும் சொல்லலாம்.',
    examples: [
      x('I will call you tomorrow.', 'நான் நாளை உங்களுக்கு அழைப்பேன்.'),
      x('She will join the team next week.', 'அவள் அடுத்த வாரம் குழுவில் சேருவாள்.'),
      x('It will rain tonight.', 'இன்றிரவு மழை பெய்யும்.'),
      x('We will not be late.', 'நாங்கள் தாமதமாக மாட்டோம்.'),
      x('I will help you with the bags.', 'நான் பைகளைத் தூக்க உங்களுக்கு உதவுவேன்.'),
      x('Will you come to my house on Sunday?', 'நீங்கள் ஞாயிற்றுக்கிழமை என் வீட்டுக்கு வருவீர்களா?'),
    ],
    prompts: [
      'Write one sentence about what you will do tomorrow.',
      'Write one sentence about a promise you will keep.',
      'Write one sentence about your plan for next year.',
      'Write one negative sentence using "will not".',
      'Write one question starting with "Will you".',
      'Write one sentence predicting the weather tomorrow.',
    ],
    tamil: [
      t('நான் நாளை உங்களைச் சந்திப்பேன்.', 'I will meet you tomorrow.', ['meet', 'tomo']),
      t('அவள் அடுத்த வாரம் வருவாள்.', 'She will come next week.', ['come', 'next', 'week']),
      t('நாங்கள் தாமதமாக மாட்டோம்.', 'We will not be late.', ['late']),
      t('நாளை மழை பெய்யும்.', 'It will rain tomorrow.', ['rain', 'tomo']),
      t('நீ எனக்கு உதவுவாயா?', 'Will you help me?', ['help']),
      t('நான் உன்னிடம் பின்னர் அழைப்பேன்.', 'I will call you later.', ['call', 'late']),
    ],
  },
  {
    id: 'future-continuous', name: 'Future Continuous',
    structure: 'Subject + will + be + verb-ing',
    positive: 'Subject + will be + verb-ing — I will be working at ten.',
    negative: 'Subject + will + not + be + verb-ing — I will not be working at ten.',
    question: 'Will + subject + be + verb-ing + ? — Will you be working at ten?',
    usage: 'Use it for an action that will be in progress at a certain time in the future.',
    usageTa: 'எதிர்காலத்தில் ஒரு குறிப்பிட்ட நேரத்தில் நடந்துகொண்டிருக்கும் செயலுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I will be working at ten tomorrow.', 'நாளை பத்து மணிக்கு நான் வேலை செய்துகொண்டிருப்பேன்.'),
      x('She will be travelling to Mumbai this time next week.', 'அடுத்த வாரம் இதே நேரத்தில் அவள் மும்பைக்குப் பயணம் செய்துகொண்டிருப்பாள்.'),
      x('They will be waiting for us at the station.', 'அவர்கள் நிலையத்தில் எங்களுக்காகக் காத்துக்கொண்டிருப்பார்கள்.'),
      x('We will be having dinner at eight.', 'நாங்கள் எட்டு மணிக்கு இரவு உணவு சாப்பிட்டுக்கொண்டிருப்போம்.'),
      x('He will not be sleeping at midnight.', 'நள்ளிரவில் அவன் தூங்கிக்கொண்டிருக்க மாட்டான்.'),
      x('Will you be using the car this evening?', 'இன்று மாலை நீங்கள் காரைப் பயன்படுத்திக்கொண்டிருப்பீர்களா?'),
    ],
    prompts: [
      'Write one sentence about what you will be doing at nine o\'clock tomorrow.',
      'Write one sentence about what you will be doing this time next week.',
      'Write one sentence about what your family will be doing tomorrow evening.',
      'Write one negative sentence using "will not be".',
      'Write one question starting with "Will you be".',
      'Write one sentence about a friend who will be travelling.',
    ],
    tamil: [
      t('நாளை காலை நான் வேலை செய்துகொண்டிருப்பேன்.', 'I will be working tomorrow morning.', ['work', 'tomo', 'morn']),
      t('அடுத்த வாரம் இதே நேரத்தில் நாங்கள் பயணம் செய்துகொண்டிருப்போம்.', 'We will be travelling this time next week.', ['trav', 'next', 'week']),
      t('அவள் எட்டு மணிக்கு சமைத்துக்கொண்டிருப்பாள்.', 'She will be cooking at eight.', ['cook', 'eigh']),
      t('நீ நாளை படித்துக்கொண்டிருப்பாயா?', 'Will you be studying tomorrow?', ['stud', 'tomo']),
      t('அவர்கள் நிலையத்தில் காத்துக்கொண்டிருப்பார்கள்.', 'They will be waiting at the station.', ['wait', 'stat']),
      t('நான் இன்றிரவு தூங்கிக்கொண்டிருக்க மாட்டேன்.', 'I will not be sleeping tonight.', ['slee', 'toni']),
    ],
  },
  {
    id: 'future-perfect', name: 'Future Perfect',
    structure: 'Subject + will + have + past participle',
    positive: 'Subject + will have + past participle — I will have completed it by Monday.',
    negative: 'Subject + will + not + have + past participle — I will not have completed it by Monday.',
    question: 'Will + subject + have + past participle + ? — Will you have completed it by Monday?',
    usage: 'Use it for an action that will be finished before a certain time in the future.',
    usageTa: 'எதிர்காலத்தில் ஒரு குறிப்பிட்ட நேரத்துக்கு முன் முடிந்திருக்கும் செயலுக்கு இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('I will have completed the report by Monday.', 'திங்கட்கிழமைக்குள் நான் அறிக்கையை முடித்திருப்பேன்.'),
      x('She will have left before you arrive.', 'நீங்கள் வருவதற்குள் அவள் புறப்பட்டிருப்பாள்.'),
      x('They will have finished dinner by eight.', 'எட்டு மணிக்குள் அவர்கள் இரவு உணவை முடித்திருப்பார்கள்.'),
      x('We will have lived here for ten years next March.', 'அடுத்த மார்ச்சில் நாங்கள் இங்கு பத்து ஆண்டுகள் வசித்திருப்போம்.'),
      x('He will not have woken up by seven.', 'ஏழு மணிக்குள் அவன் எழுந்திருக்க மாட்டான்.'),
      x('Will you have finished the work by Friday?', 'வெள்ளிக்குள் நீங்கள் வேலையை முடித்திருப்பீர்களா?'),
    ],
    prompts: [
      'Write one sentence about something you will have finished by the end of this week.',
      'Write one sentence using "by" and a future time.',
      'Write one sentence about what will have happened before the new year.',
      'Write one negative sentence using "will not have".',
      'Write one question starting with "Will you have".',
      'Write one sentence about what a friend will have done by next month.',
    ],
    tamil: [
      t('திங்கட்கிழமைக்குள் நான் இதை முடித்திருப்பேன்.', 'I will have finished this by Monday.', ['fini', 'mond']),
      t('நீ வருவதற்குள் அவள் சென்றிருப்பாள்.', 'She will have gone before you come.', ['gone', 'befo']),
      t('அடுத்த ஆண்டுக்குள் நாங்கள் புதிய வீடு வாங்கியிருப்போம்.', 'We will have bought a new house by next year.', ['boug', 'hous', 'next']),
      t('அவர்கள் எட்டு மணிக்குள் சாப்பிட்டு முடித்திருப்பார்கள்.', 'They will have eaten by eight o\'clock.', ['eate', 'eigh']),
      t('நீ வெள்ளிக்குள் அறிக்கையை முடித்திருப்பாயா?', 'Will you have finished the report by Friday?', ['fini', 'repo', 'frid']),
      t('அவன் அதற்குள் படிப்பை முடித்திருக்க மாட்டான்.', 'He will not have finished his studies by then.', ['fini', 'stud']),
    ],
  },
  {
    id: 'future-perfect-continuous', name: 'Future Perfect Continuous',
    structure: 'Subject + will + have + been + verb-ing',
    positive: 'Subject + will have been + verb-ing — By June, I will have been working here for a year.',
    negative: 'Subject + will + not + have been + verb-ing — I will not have been working for a year.',
    question: 'Will + subject + have been + verb-ing + ? — Will you have been working here for a year?',
    usage: 'Use it to say how long an action will have been going on up to a point in the future.',
    usageTa: 'எதிர்காலத்தில் ஒரு புள்ளி வரை ஒரு செயல் எவ்வளவு காலம் தொடர்ந்திருக்கும் என்பதைச் சொல்ல இதைப் பயன்படுத்துவோம்.',
    examples: [
      x('By June, I will have been working here for a year.', 'ஜூன் மாதத்துக்குள் நான் இங்கு ஓராண்டாக வேலை செய்துகொண்டிருப்பேன்.'),
      x('She will have been studying for six hours by noon.', 'மதியத்துக்குள் அவள் ஆறு மணி நேரமாகப் படித்துக்கொண்டிருப்பாள்.'),
      x('They will have been travelling for two days when they arrive.', 'அவர்கள் வந்து சேரும்போது இரண்டு நாட்களாகப் பயணம் செய்துகொண்டிருப்பார்கள்.'),
      x('We will have been living here for ten years in March.', 'மார்ச்சில் நாங்கள் இங்கு பத்து ஆண்டுகளாக வசித்துக்கொண்டிருப்போம்.'),
      x('He will not have been sleeping long when you call.', 'நீங்கள் அழைக்கும்போது அவன் அதிக நேரம் தூங்கியிருக்க மாட்டான்.'),
      x('How long will you have been waiting by five o\'clock?', 'ஐந்து மணிக்குள் நீங்கள் எவ்வளவு நேரம் காத்துக்கொண்டிருப்பீர்கள்?'),
    ],
    prompts: [
      'Write one sentence about how long you will have been learning English by next year.',
      'Write one sentence using "by" and "for": how long something will have been going on.',
      'Write one sentence about how long you will have been living in your house by 2030.',
      'Write one negative sentence using "will not have been".',
      'Write one question starting with "How long will you have been".',
      'Write one sentence about a friend who will have been working for years by a future date.',
    ],
    tamil: [
      t('அடுத்த ஆண்டுக்குள் நான் இங்கு ஐந்து ஆண்டுகளாக வேலை செய்துகொண்டிருப்பேன்.', 'By next year, I will have been working here for five years.', ['work', 'five', 'next']),
      t('மதியத்துக்குள் அவள் நான்கு மணி நேரமாகப் படித்துக்கொண்டிருப்பாள்.', 'By noon, she will have been studying for four hours.', ['stud', 'four', 'noon']),
      t('ஜூனில் நாங்கள் இங்கு பத்து ஆண்டுகளாக வசித்துக்கொண்டிருப்போம்.', 'In June, we will have been living here for ten years.', ['livi', 'ten', 'june']),
      t('நீ வரும்போது நான் இரண்டு மணி நேரமாகக் காத்துக்கொண்டிருப்பேன்.', 'I will have been waiting for two hours when you come.', ['wait', 'two']),
      t('நீ எவ்வளவு காலமாக ஓடிக்கொண்டிருப்பாய்?', 'How long will you have been running?', ['long', 'runn']),
      t('அவன் அதிக நேரம் வேலை செய்துகொண்டிருக்க மாட்டான்.', 'He will not have been working for long.', ['work', 'long']),
    ],
  },
];

export function tenseLesson(id: string): TenseLesson | undefined {
  return TENSE_LESSONS.find((l) => l.id === id);
}
