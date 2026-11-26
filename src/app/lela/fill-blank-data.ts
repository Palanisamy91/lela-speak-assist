// Fill in the Blank question bank. Pure data and pure functions, no Angular.
//
// Sources (nothing existing is changed or deleted):
//  1. hand-written questions below (everyday sentences, verb forms, articles, pronouns, conjunctions, vocabulary, conversation)
//  2. every preposition question already in preposition-data.ts
//  3. verb-form / tense questions made from the 12 tense lessons in tense-data.ts
// Every question has four options, a Tamil meaning, a simple English explanation and a Tamil explanation.

import { PREPOSITION_LESSONS } from './preposition-data';
import { TENSE_LESSONS } from './tense-data';

export type BlankCategory = 'everyday' | 'verbs' | 'prepositions' | 'articles' | 'pronouns' | 'conjunctions' | 'vocabulary' | 'conversation';

export const BLANK_CATEGORY_LABEL: Record<BlankCategory, string> = {
  everyday: 'Everyday English', verbs: 'Verb forms and tenses', prepositions: 'Prepositions', articles: 'Articles',
  pronouns: 'Pronouns', conjunctions: 'Conjunctions', vocabulary: 'Vocabulary', conversation: 'Conversation',
};

export interface BlankQuestion {
  id: string;
  category: BlankCategory;
  /** Sentence with ____ where the word goes. */
  blank: string;
  /** The complete correct sentence. */
  full: string;
  ta: string;
  /** Four options. Exactly one of them is the main answer. */
  options: string[];
  /** Every accepted answer (the first one is the main answer). */
  answers: string[];
  explain: string;
  explainTa: string;
}

const CATEGORY_TAMIL: Record<BlankCategory, string> = {
  everyday: 'வாக்கியத்தின் பொருளையும் இலக்கண அமைப்பையும் கவனித்துச் சரியான சொல்லைத் தேர்ந்தெடுக்கவும்.',
  verbs: 'எழுவாய் மற்றும் காலத்துக்கு ஏற்ற வினைச்சொல் வடிவத்தைத் தேர்ந்தெடுக்கவும்.',
  prepositions: 'இடம், நேரம், திசைக்கு ஏற்ற முன்னிடைச்சொல்லை (preposition) தேர்ந்தெடுக்கவும்.',
  articles: 'முதல் முறை சொல்லும் பொருளுக்கு a / an; குறிப்பிட்ட, ஏற்கெனவே தெரிந்த பொருளுக்கு the. உயிரொலியில் தொடங்கும் சொல்லுக்கு முன் an.',
  pronouns: 'வாக்கியத்தில் யார் செய்கிறார், யாருக்கு, யாருடையது என்று பார்த்துச் சரியான பிரதிப்பெயரைத் தேர்ந்தெடுக்கவும்.',
  conjunctions: 'இரண்டு பகுதிகளை இணைக்கும் சரியான இணைப்புச்சொல்லைத் (and, but, because, so…) தேர்ந்தெடுக்கவும்.',
  vocabulary: 'வாக்கியத்தின் பொருளுக்கு ஏற்ற சொல்லைத் தேர்ந்தெடுக்கவும்.',
  conversation: 'உரையாடலில் இயல்பாகப் பொருந்தும் சொல்லைத் தேர்ந்தெடுக்கவும்.',
};

/** [sentence with the answer in braces, Tamil meaning, 3 wrong options, English explanation, (optional) other accepted answers] */
type Src = [sentence: string, ta: string, wrong: [string, string, string], explain: string, alts?: string[]];

const EVERYDAY: Src[] = [
  ['She {goes} to school every day.', 'அவள் தினமும் பள்ளிக்குச் செல்கிறாள்.', ['go', 'going', 'gone'], 'With he, she or it in the present simple, the verb takes "s" or "es".'],
  ['I {drink} tea every morning.', 'நான் தினமும் காலையில் தேநீர் குடிக்கிறேன்.', ['drinks', 'drinking', 'drunk'], 'With "I" the present simple verb stays in the base form.'],
  ['My father {works} in a bank.', 'என் அப்பா ஒரு வங்கியில் வேலை செய்கிறார்.', ['work', 'working', 'worked'], '"My father" is singular (he), so the verb takes "s".'],
  ['They {are} playing football now.', 'அவர்கள் இப்போது கால்பந்து விளையாடிக்கொண்டிருக்கிறார்கள்.', ['is', 'am', 'was'], 'Use "are" with "they" in the present continuous.'],
  ['We {have} two children.', 'எங்களுக்கு இரண்டு குழந்தைகள் உள்ளன.', ['has', 'having', 'had been'], 'Use "have" with I, you, we and they.'],
  ['The shop {opens} at nine o\'clock.', 'கடை ஒன்பது மணிக்குத் திறக்கும்.', ['open', 'opening', 'opened'], '"The shop" is singular, so the present simple verb takes "s".'],
  ['Please {give} me a glass of water.', 'தயவுசெய்து எனக்கு ஒரு டம்ளர் தண்ணீர் கொடுங்கள்.', ['gives', 'giving', 'gave'], 'After "please" we use the base form of the verb.'],
  ['He {does} not like coffee.', 'அவனுக்குக் காபி பிடிக்காது.', ['do', 'did', 'doing'], 'Use "does not" with he, she and it.'],
  ['How much {is} this shirt?', 'இந்தச் சட்டையின் விலை என்ன?', ['are', 'do', 'does'], 'A singular thing takes "is" in this question.'],
  ['I {am} from Chennai.', 'நான் சென்னையைச் சேர்ந்தவன்.', ['is', 'are', 'be'], 'Use "am" only with "I".'],
  ['There {are} many people in the hall.', 'மண்டபத்தில் நிறைய மக்கள் இருக்கிறார்கள்.', ['is', 'was', 'has'], '"People" is plural, so we use "there are".'],
  ['She is {taller} than her sister.', 'அவள் தன் தங்கையை விட உயரமாக இருக்கிறாள்.', ['tall', 'tallest', 'more tall'], 'We use the comparative form (taller) with "than".'],
  ['This is the {best} film I have ever seen.', 'நான் பார்த்த படங்களில் இதுவே மிகச் சிறந்த படம்.', ['good', 'better', 'well'], 'We use the superlative (best) for the number one of all.'],
  ['He speaks English very {well}.', 'அவன் ஆங்கிலத்தை மிக நன்றாகப் பேசுகிறான்.', ['good', 'best', 'fine good'], '"Well" is the adverb. It describes the verb "speaks".'],
  ['I do not have {any} money today.', 'இன்று என்னிடம் பணம் இல்லை.', ['some', 'a', 'an'], 'In a negative sentence we use "any".'],
  ['Can you help me? — Yes, {of} course.', 'எனக்கு உதவ முடியுமா? — ஆம், நிச்சயமாக.', ['off', 'at', 'in'], '"Of course" is a fixed phrase meaning "certainly".'],
  ['He was late {because} the bus was slow.', 'பேருந்து மெதுவாக வந்ததால் அவன் தாமதமாக வந்தான்.', ['but', 'so', 'or'], '"Because" gives the reason.'],
  ['What time {does} the train leave?', 'ரயில் எத்தனை மணிக்குப் புறப்படும்?', ['do', 'is', 'are'], 'The subject "train" is singular, so we use "does".'],
  ['I {usually} wake up at six.', 'நான் வழக்கமாக ஆறு மணிக்கு எழுவேன்.', ['usual', 'use', 'used'], '"Usually" is an adverb of frequency; it goes before the main verb.'],
  ['Please {be} quiet in the library.', 'நூலகத்தில் தயவுசெய்து அமைதியாக இருங்கள்.', ['is', 'are', 'being'], 'After "please" in a request we use "be".'],
];

const VERBS: Src[] = [
  ['Yesterday I {went} to the market.', 'நேற்று நான் சந்தைக்குச் சென்றேன்.', ['go', 'gone', 'going'], '"Yesterday" shows the past simple. The past of "go" is "went".'],
  ['She has {finished} her homework.', 'அவள் வீட்டுப்பாடத்தை முடித்துவிட்டாள்.', ['finish', 'finishing', 'finishes'], 'After "has" or "have" we use the past participle.'],
  ['I am {reading} a book now.', 'நான் இப்போது ஒரு புத்தகம் படித்துக்கொண்டிருக்கிறேன்.', ['read', 'reads', 'to read'], 'The present continuous is am/is/are + verb-ing.'],
  ['He {ate} rice for lunch yesterday.', 'அவன் நேற்று மதிய உணவுக்குச் சாதம் சாப்பிட்டான்.', ['eat', 'eaten', 'eating'], 'The past simple of "eat" is "ate".'],
  ['They have {seen} that film twice.', 'அவர்கள் அந்தப் படத்தை இரண்டு முறை பார்த்திருக்கிறார்கள்.', ['saw', 'see', 'seeing'], 'The past participle of "see" is "seen".'],
  ['We {will} visit our grandmother tomorrow.', 'நாங்கள் நாளை எங்கள் பாட்டியைப் பார்க்கச் செல்வோம்.', ['are', 'did', 'have'], '"Tomorrow" shows the future. Use "will" + base verb.'],
  ['It was {raining} when we left.', 'நாங்கள் புறப்பட்டபோது மழை பெய்துகொண்டிருந்தது.', ['rain', 'rains', 'rained'], 'The past continuous is was/were + verb-ing.'],
  ['She {did} not call me last night.', 'அவள் நேற்று இரவு எனக்கு அழைக்கவில்லை.', ['does', 'do', 'has'], 'Use "did not" + base verb for a negative past simple.'],
  ['I had {eaten} before he arrived.', 'அவர் வருவதற்கு முன்பே நான் சாப்பிட்டிருந்தேன்.', ['ate', 'eat', 'eating'], 'After "had" we use the past participle.'],
  ['Does she {like} tea?', 'அவளுக்குத் தேநீர் பிடிக்குமா?', ['likes', 'liking', 'liked'], 'After "does" we use the base verb.'],
  ['He has been {waiting} for an hour.', 'அவன் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருக்கிறான்.', ['wait', 'waited', 'waits'], 'The present perfect continuous is have/has been + verb-ing.'],
  ['I {have} lived here since 2018.', 'நான் 2018 முதல் இங்கு வசிக்கிறேன்.', ['am', 'had', 'did'], '"Since 2018" needs the present perfect: have + past participle.'],
  ['By next year, I will have {completed} my course.', 'அடுத்த ஆண்டுக்குள் நான் என் படிப்பை முடித்திருப்பேன்.', ['complete', 'completing', 'completes'], 'The future perfect is will have + past participle.'],
  ['Tomorrow at ten, I will be {working}.', 'நாளை பத்து மணிக்கு நான் வேலை செய்துகொண்டிருப்பேன்.', ['work', 'worked', 'works'], 'The future continuous is will be + verb-ing.'],
  ['The children {were} sleeping at midnight.', 'நள்ளிரவில் குழந்தைகள் தூங்கிக்கொண்டிருந்தார்கள்.', ['was', 'is', 'are'], 'Use "were" with plural subjects in the past continuous.'],
  ['He {wrote} a letter to his uncle last week.', 'அவன் கடந்த வாரம் தன் மாமாவுக்கு ஒரு கடிதம் எழுதினான்.', ['write', 'written', 'writes'], 'The past simple of "write" is "wrote".'],
  ['I have never {been} to Delhi.', 'நான் டெல்லிக்கு ஒருபோதும் போனதில்லை.', ['be', 'was', 'being'], 'The present perfect of "be" is have been.'],
  ['She {bought} a new phone last month.', 'அவள் கடந்த மாதம் ஒரு புதிய தொலைபேசி வாங்கினாள்.', ['buy', 'buys', 'buying'], '"Last month" shows the past simple. The past of "buy" is "bought".'],
  ['It {rains} a lot in November here.', 'இங்கே நவம்பரில் நிறைய மழை பெய்யும்.', ['rain', 'raining', 'rained'], 'We use the present simple for general facts. "It" takes "s".'],
  ['Look! The baby is {smiling}.', 'பாருங்கள்! குழந்தை சிரித்துக்கொண்டிருக்கிறது.', ['smile', 'smiles', 'smiled'], '"Look!" shows an action happening now: is + verb-ing.'],
];

const ARTICLES: Src[] = [
  ['There is {a} book on the table.', 'மேசை மேல் ஒரு புத்தகம் இருக்கிறது.', ['an', 'the', 'no article'], '"There is" introduces something new, so we use "a" before a consonant sound.'],
  ['I need {an} umbrella today.', 'எனக்கு இன்று ஒரு குடை வேண்டும்.', ['a', 'the', 'no article'], '"Umbrella" starts with a vowel sound, so we use "an".'],
  ['The sun rises in {the} east.', 'சூரியன் கிழக்கில் உதிக்கிறது.', ['a', 'an', 'no article'], 'We use "the" with directions such as the east.'],
  ['She is {an} honest girl.', 'அவள் ஒரு நேர்மையான பெண்.', ['a', 'the', 'no article'], '"Honest" starts with a vowel sound (the h is silent), so we use "an".'],
  ['He is {a} university student.', 'அவன் ஒரு பல்கலைக்கழக மாணவன்.', ['an', 'the', 'no article'], '"University" starts with a "yoo" sound, so we use "a".'],
  ['I saw a dog. {The} dog was very big.', 'நான் ஒரு நாயைப் பார்த்தேன். அந்த நாய் மிகப் பெரியது.', ['A', 'An', 'No article'], 'The dog was already mentioned, so we use "the".'],
  ['There is {an} apple in the basket.', 'கூடையில் ஒரு ஆப்பிள் இருக்கிறது.', ['a', 'the', 'no article'], '"Apple" starts with a vowel sound, so we use "an".'],
  ['Please close {the} door.', 'தயவுசெய்து கதவை மூடுங்கள்.', ['a', 'an', 'no article'], 'Both of us know which door, so we use "the".'],
  ['My brother is {an} engineer.', 'என் அண்ணன் ஒரு பொறியாளர்.', ['a', 'the', 'no article'], '"Engineer" starts with a vowel sound, so we use "an".'],
  ['She plays {the} guitar very well.', 'அவள் கிடார் மிக நன்றாக வாசிப்பாள்.', ['a', 'an', 'no article'], 'We use "the" with musical instruments.'],
  ['There is {an} elephant in the picture.', 'படத்தில் ஒரு யானை இருக்கிறது.', ['a', 'the', 'no article'], '"Elephant" starts with a vowel sound, so we use "an".'],
  ['Mount Everest is {the} highest mountain in the world.', 'எவரெஸ்ட் உலகின் மிக உயரமான மலை.', ['a', 'an', 'no article'], 'We use "the" with superlatives such as highest.'],
  ['I bought {a} new phone yesterday.', 'நான் நேற்று ஒரு புதிய தொலைபேசி வாங்கினேன்.', ['an', 'the', 'no article'], '"New" starts with a consonant sound, so we use "a".'],
  ['It takes {an} hour to reach the station.', 'ரயில் நிலையம் செல்ல ஒரு மணி நேரம் ஆகும்.', ['a', 'the', 'no article'], '"Hour" starts with a vowel sound (the h is silent), so we use "an".'],
  ['He is {a} European.', 'அவர் ஒரு ஐரோப்பியர்.', ['an', 'the', 'no article'], '"European" starts with a "yoo" sound, so we use "a".'],
  ['There is {a} cat under the chair.', 'நாற்காலிக்குக் கீழே ஒரு பூனை இருக்கிறது.', ['an', 'the', 'no article'], '"There is" introduces something new; "cat" starts with a consonant sound.'],
  ['The moon goes around {the} earth.', 'நிலா பூமியைச் சுற்றி வருகிறது.', ['a', 'an', 'no article'], 'We use "the" for things that are the only one of their kind.'],
  ['I want to be {a} doctor.', 'நான் ஒரு மருத்துவராக விரும்புகிறேன்.', ['an', 'the', 'no article'], 'Before the name of a job we use "a" or "an". "Doctor" starts with a consonant sound.'],
  ['She ate {an} orange for breakfast.', 'அவள் காலை உணவுக்கு ஒரு ஆரஞ்சுப் பழம் சாப்பிட்டாள்.', ['a', 'the', 'no article'], '"Orange" starts with a vowel sound, so we use "an".'],
  ['I live in {a} small village.', 'நான் ஒரு சிறிய கிராமத்தில் வசிக்கிறேன்.', ['an', 'the', 'no article'], '"Small" starts with a consonant sound, so we use "a".'],
];

const PRONOUNS: Src[] = [
  ['{She} is my sister. She lives in Madurai.', 'அவள் என் தங்கை. அவள் மதுரையில் வசிக்கிறாள்.', ['Her', 'He', 'Him'], '"She" is the subject for a girl or woman.'],
  ['Ravi is late. {He} missed the bus.', 'ரவி தாமதமாக வந்தான். அவன் பேருந்தைத் தவறவிட்டான்.', ['Him', 'His', 'She'], '"He" replaces a boy or man as the subject.'],
  ['Please help {me} with this bag.', 'தயவுசெய்து இந்தப் பையுடன் எனக்கு உதவுங்கள்.', ['I', 'my', 'mine'], 'After a verb we use "me" (the object form).'],
  ['This is my book. That one is {yours}.', 'இது என் புத்தகம். அது உன்னுடையது.', ['you', 'your', 'yourself'], '"Yours" means "belongs to you" and stands alone.'],
  ['We love {our} country.', 'நாங்கள் எங்கள் நாட்டை நேசிக்கிறோம்.', ['we', 'us', 'ours'], '"Our" shows that the country belongs to us.'],
  ['The teacher gave {us} some homework.', 'ஆசிரியர் எங்களுக்குச் சிறிது வீட்டுப்பாடம் கொடுத்தார்.', ['we', 'our', 'ours'], 'After a verb we use "us" (the object form of we).'],
  ['I can see {them} in the garden.', 'நான் அவர்களைத் தோட்டத்தில் பார்க்கிறேன்.', ['they', 'their', 'theirs'], 'After a verb we use "them" (the object form of they).'],
  ['Meena forgot {her} umbrella.', 'மீனா தன் குடையை மறந்துவிட்டாள்.', ['she', 'hers', 'him'], '"Her" shows the umbrella belongs to Meena.'],
  ['The dog wagged {its} tail.', 'நாய் தன் வாலை ஆட்டியது.', ['it\'s', 'it', 'their'], '"Its" (no apostrophe) shows that the tail belongs to the dog.'],
  ['I hurt {myself} while cooking.', 'சமைக்கும்போது நான் என்னையே காயப்படுத்திக்கொண்டேன்.', ['me', 'my', 'mine'], '"Myself" is used when the doer and the receiver are the same person.'],
  ['{They} are playing cricket in the park.', 'அவர்கள் பூங்காவில் கிரிக்கெட் விளையாடுகிறார்கள்.', ['Them', 'Their', 'He'], '"They" is the subject for more than one person.'],
  ['Can you give {him} this message?', 'இந்தச் செய்தியை அவனிடம் கொடுக்க முடியுமா?', ['he', 'his', 'she'], 'After a verb we use "him" (the object form of he).'],
  ['{It} is raining outside.', 'வெளியே மழை பெய்கிறது.', ['He', 'She', 'They'], 'We use "it" for the weather.'],
  ['This pen is not mine. It is {his}.', 'இந்தப் பேனா என்னுடையது அல்ல. இது அவனுடையது.', ['he', 'him', 'himself'], '"His" can stand alone and means "belongs to him".'],
  ['You and I are friends. {We} study together.', 'நீயும் நானும் நண்பர்கள். நாம் சேர்ந்து படிக்கிறோம்.', ['Us', 'Our', 'They'], '"We" means you and I.'],
  ['My mother is a teacher. I help {her} every day.', 'என் அம்மா ஒரு ஆசிரியை. நான் தினமும் அவளுக்கு உதவுகிறேன்.', ['she', 'hers', 'him'], 'After a verb we use "her" (the object form of she).'],
  ['Where is {your} phone?', 'உன் தொலைபேசி எங்கே?', ['you', 'yours', 'yourself'], '"Your" shows the phone belongs to you.'],
  ['The children made the cake {themselves}.', 'குழந்தைகள் அந்தக் கேக்கைத் தாங்களாகவே செய்தார்கள்.', ['them', 'their', 'theirs'], '"Themselves" stresses that they did it on their own.'],
  ['Is this bag {yours} or mine?', 'இந்தப் பை உன்னுடையதா அல்லது என்னுடையதா?', ['you', 'your', 'yourself'], '"Yours" stands alone and means "belongs to you".'],
  ['Ravi and Anu are my friends. I call {them} every week.', 'ரவியும் அனுவும் என் நண்பர்கள். நான் வாரந்தோறும் அவர்களுக்கு அழைப்பேன்.', ['they', 'their', 'theirs'], 'After a verb we use "them" (the object form of they).'],
];

const CONJUNCTIONS: Src[] = [
  ['I like tea {and} coffee.', 'எனக்குத் தேநீரும் காபியும் பிடிக்கும்.', ['but', 'because', 'although'], '"And" joins two similar things.'],
  ['I wanted to go out, {but} it was raining.', 'நான் வெளியே போக விரும்பினேன், ஆனால் மழை பெய்துகொண்டிருந்தது.', ['and', 'because', 'so'], '"But" shows a difference or problem.'],
  ['He was tired, {so} he went to bed early.', 'அவன் களைப்பாக இருந்தான், அதனால் சீக்கிரமே தூங்கச் சென்றான்.', ['but', 'because', 'although'], '"So" shows the result.'],
  ['She stayed at home {because} she was ill.', 'அவள் உடல்நலமில்லாததால் வீட்டிலேயே இருந்தாள்.', ['so', 'but', 'or'], '"Because" gives the reason.'],
  ['Do you want tea {or} coffee?', 'உங்களுக்குத் தேநீர் வேண்டுமா அல்லது காபி வேண்டுமா?', ['and', 'but', 'so'], '"Or" gives a choice.'],
  ['{Although} it was cold, we went for a walk.', 'குளிராக இருந்தாலும் நாங்கள் நடைப்பயிற்சிக்குச் சென்றோம்.', ['Because', 'So', 'And'], '"Although" shows something surprising happened in spite of a problem.'],
  ['Please call me {when} you reach home.', 'நீங்கள் வீடு சேர்ந்ததும் எனக்கு அழைப்பு செய்யுங்கள்.', ['but', 'or', 'because'], '"When" shows the time of the action.'],
  ['I will go to the party {if} I finish my work.', 'என் வேலையை முடித்தால் நான் விருந்துக்குச் செல்வேன்.', ['but', 'and', 'because'], '"If" shows a condition.'],
  ['Wash your hands {before} you eat.', 'சாப்பிடுவதற்கு முன் கைகளைக் கழுவுங்கள்.', ['after', 'but', 'so'], '"Before" shows the first action.'],
  ['We played cricket {while} it was still light.', 'வெளிச்சம் இருக்கும்போதே நாங்கள் கிரிக்கெட் விளையாடினோம்.', ['but', 'or', 'so'], '"While" means "at the same time as".'],
  ['She is smart {and} hardworking.', 'அவள் புத்திசாலி மற்றும் கடின உழைப்பாளி.', ['but', 'so', 'because'], '"And" adds one more good quality.'],
  ['He studied hard, {so} he passed the exam.', 'அவன் கடினமாகப் படித்தான், அதனால் தேர்வில் தேர்ச்சி பெற்றான்.', ['but', 'because', 'or'], '"So" shows the result of studying hard.'],
  ['I am hungry, {but} there is no food at home.', 'எனக்குப் பசிக்கிறது, ஆனால் வீட்டில் உணவு இல்லை.', ['so', 'and', 'because'], '"But" shows a problem.'],
  ['Hurry up, {or} you will miss the bus.', 'சீக்கிரம் வாருங்கள், இல்லையென்றால் பேருந்தைத் தவறவிடுவீர்கள்.', ['and', 'because', 'although'], '"Or" here means "otherwise".'],
  ['Stay here {until} I come back.', 'நான் திரும்பி வரும் வரை இங்கேயே இருங்கள்.', ['because', 'but', 'so'], '"Until" shows the time up to which something continues.'],
  ['I could not come {because} I had a fever.', 'எனக்குக் காய்ச்சல் இருந்ததால் என்னால் வர முடியவில்லை.', ['so', 'but', 'or'], '"Because" gives the reason for not coming.'],
  ['{After} she finished her work, she went home.', 'தன் வேலையை முடித்த பிறகு அவள் வீட்டுக்குச் சென்றாள்.', ['Because', 'But', 'Or'], '"After" shows the order of two actions.'],
  ['It was raining, {so} we stayed inside.', 'மழை பெய்துகொண்டிருந்தது, அதனால் நாங்கள் உள்ளேயே இருந்தோம்.', ['but', 'although', 'or'], '"So" shows the result of the rain.'],
  ['She is poor, {but} she is happy.', 'அவள் ஏழை, ஆனால் மகிழ்ச்சியாக இருக்கிறாள்.', ['so', 'because', 'and'], '"But" joins two ideas that are different from what we expect.'],
  ['I will wait here {unless} you come.', 'நீங்கள் வராவிட்டால் தவிர நான் இங்கேயே காத்திருப்பேன்.', ['because', 'so', 'and'], '"Unless" means "if not".'],
];

const VOCABULARY: Src[] = [
  ['I did not sleep well, so I am very {tired} today.', 'நான் நன்றாகத் தூங்கவில்லை, அதனால் இன்று மிகவும் களைப்பாக இருக்கிறேன்.', ['hungry', 'thirsty', 'angry'], '"Tired" means you need rest or sleep.'],
  ['It is very hot. I am {thirsty}. I need some water.', 'மிகவும் வெப்பமாக இருக்கிறது. எனக்குத் தாகமாக இருக்கிறது. எனக்குச் சிறிது தண்ணீர் வேண்டும்.', ['sleepy', 'hungry', 'cold'], '"Thirsty" means you need to drink.'],
  ['The doctor will {examine} the patient.', 'மருத்துவர் நோயாளியைப் பரிசோதிப்பார்.', ['teach', 'cook', 'paint'], '"Examine" means to check carefully.'],
  ['Please {switch} off the fan when you leave.', 'நீங்கள் புறப்படும்போது மின்விசிறியை அணையுங்கள்.', ['cut', 'wash', 'open'], '"Switch off" means to stop a machine.'],
  ['I want to {borrow} a pen from you.', 'நான் உங்களிடமிருந்து ஒரு பேனாவை இரவல் வாங்க விரும்புகிறேன்.', ['lend', 'steal', 'sell'], '"Borrow" means to take something for a short time and give it back.'],
  ['Could you {lend} me your umbrella?', 'உங்கள் குடையை எனக்குக் கடன் தர முடியுமா?', ['borrow', 'break', 'buy'], '"Lend" means to give something for a short time.'],
  ['The film was so {boring} that I fell asleep.', 'படம் மிகவும் சலிப்பாக இருந்ததால் நான் தூங்கிவிட்டேன்.', ['exciting', 'delicious', 'noisy'], '"Boring" means not interesting.'],
  ['She is very {kind}. She helps everyone.', 'அவள் மிகவும் அன்பானவள். எல்லோருக்கும் உதவுகிறாள்.', ['rude', 'lazy', 'selfish'], '"Kind" means friendly and helpful.'],
  ['This road is very {narrow}. Only one car can pass.', 'இந்தச் சாலை மிகவும் குறுகலானது. ஒரு கார் மட்டுமே செல்ல முடியும்.', ['wide', 'long', 'clean'], '"Narrow" means not wide.'],
  ['I have a {headache}. I need to rest.', 'எனக்குத் தலைவலி. நான் ஓய்வெடுக்க வேண்டும்.', ['toothpaste', 'ticket', 'luggage'], '"Headache" is a pain in the head.'],
  ['Please {repeat} the question. I did not hear it.', 'தயவுசெய்து கேள்வியை மீண்டும் சொல்லுங்கள். எனக்குக் கேட்கவில்லை.', ['forget', 'finish', 'follow'], '"Repeat" means to say again.'],
  ['The shop is {closed} on Sundays, so we cannot buy anything.', 'ஞாயிற்றுக்கிழமைகளில் கடை மூடப்பட்டிருக்கும், அதனால் எதுவும் வாங்க முடியாது.', ['crowded', 'cheap', 'famous'], '"Closed" is the opposite of open.'],
  ['He is a very {honest} man. He never tells lies.', 'அவர் மிகவும் நேர்மையான மனிதர். அவர் ஒருபோதும் பொய் சொல்ல மாட்டார்.', ['careless', 'dangerous', 'expensive'], '"Honest" means truthful.'],
  ['I will {arrive} at the station at six.', 'நான் ஆறு மணிக்கு நிலையத்தை வந்தடைவேன்.', ['leave', 'forget', 'throw'], '"Arrive" means to reach a place.'],
  ['The weather is very {pleasant} today, not too hot or cold.', 'இன்று வானிலை மிகவும் இதமாக இருக்கிறது, அதிக வெப்பமோ குளிரோ இல்லை.', ['terrible', 'dirty', 'empty'], '"Pleasant" means nice and comfortable.'],
  ['We need to {save} money for the trip.', 'பயணத்துக்காக நாம் பணம் சேமிக்க வேண்டும்.', ['waste', 'lose', 'break'], '"Save" means to keep money for later.'],
  ['The exam was very {difficult}. Nobody finished it.', 'தேர்வு மிகவும் கடினமாக இருந்தது. யாரும் முடிக்கவில்லை.', ['easy', 'short', 'funny'], '"Difficult" means hard.'],
  ['Please {fill} this form and give it to the clerk.', 'தயவுசெய்து இந்தப் படிவத்தை நிரப்பி எழுத்தரிடம் கொடுங்கள்.', ['wash', 'carry', 'sing'], '"Fill" a form means to write the details in it.'],
  ['My grandfather is {old}, but he is still very active.', 'என் தாத்தா வயதானவர், ஆனாலும் இன்னும் மிகவும் சுறுசுறுப்பாக இருக்கிறார்.', ['young', 'tiny', 'bright'], '"Old" means having lived for many years.'],
  ['He is {angry} because someone broke his phone.', 'யாரோ அவன் தொலைபேசியை உடைத்ததால் அவன் கோபமாக இருக்கிறான்.', ['pleased', 'sleepy', 'hungry'], '"Angry" means very annoyed.'],
];

const CONVERSATION: Src[] = [
  ['A: How {are} you? B: I am fine, thank you.', 'A: நீங்கள் எப்படி இருக்கிறீர்கள்? B: நான் நலமாக இருக்கிறேன், நன்றி.', ['is', 'do', 'does'], 'We ask "How are you?" to greet someone.'],
  ['A: What is your {name}? B: My name is Kumar.', 'A: உங்கள் பெயர் என்ன? B: என் பெயர் குமார்.', ['age', 'work', 'home'], 'We ask "What is your name?" to learn someone\'s name.'],
  ['A: Where do you {live}? B: I live in Coimbatore.', 'A: நீங்கள் எங்கே வசிக்கிறீர்கள்? B: நான் கோயம்புத்தூரில் வசிக்கிறேன்.', ['lives', 'living', 'lived'], 'After "do you" we use the base verb.'],
  ['A: Can I {have} a glass of water? B: Of course.', 'A: எனக்கு ஒரு டம்ளர் தண்ணீர் கிடைக்குமா? B: நிச்சயமாக.', ['has', 'having', 'had'], '"Can I have…?" is a polite way to ask for something.'],
  ['A: {Excuse} me, where is the bus stand? B: It is over there.', 'A: மன்னிக்கவும், பேருந்து நிலையம் எங்கே? B: அது அங்கே இருக்கிறது.', ['Sorry', 'Please', 'Thanks'], '"Excuse me" is used to get someone\'s attention politely.'],
  ['A: Thank you very much. B: You are {welcome}.', 'A: மிக்க நன்றி. B: பரவாயில்லை.', ['thankful', 'happy', 'sorry'], '"You are welcome" is the reply to "thank you".'],
  ['A: I am sorry I am late. B: That is {okay}. Please sit down.', 'A: தாமதமாக வந்ததற்கு மன்னிக்கவும். B: பரவாயில்லை. தயவுசெய்து உட்காருங்கள்.', ['sorry', 'please', 'goodbye'], '"That is okay" means "do not worry".'],
  ['A: What {time} is it? B: It is half past five.', 'A: மணி என்ன? B: ஐந்தரை.', ['day', 'year', 'date'], 'We ask "What time is it?" to know the clock time.'],
  ['A: Would you {like} some tea? B: Yes, please.', 'A: உங்களுக்குச் சிறிது தேநீர் வேண்டுமா? B: ஆம், தயவுசெய்து.', ['likes', 'liking', 'liked'], '"Would you like…?" is a polite offer.'],
  ['A: How {much} is this bag? B: It is five hundred rupees.', 'A: இந்தப் பையின் விலை என்ன? B: ஐநூறு ரூபாய்.', ['many', 'long', 'old'], 'We ask "How much is…?" to know the price.'],
  ['A: Could you {help} me, please? B: Sure. What do you need?', 'A: தயவுசெய்து எனக்கு உதவ முடியுமா? B: சரி. உங்களுக்கு என்ன வேண்டும்?', ['helps', 'helping', 'helped'], 'After "could you" we use the base verb.'],
  ['A: Do you speak English? B: Yes, a {little}.', 'A: நீங்கள் ஆங்கிலம் பேசுவீர்களா? B: ஆம், கொஞ்சம்.', ['few', 'many', 'much'], '"A little" is used with a language or something you cannot count.'],
  ['A: Nice to {meet} you. B: Nice to meet you too.', 'A: உங்களைச் சந்தித்ததில் மகிழ்ச்சி. B: எனக்கும் மகிழ்ச்சி.', ['meets', 'meeting', 'met'], '"Nice to meet you" is what we say when we meet someone for the first time.'],
  ['A: See you tomorrow. B: {Goodbye}! Take care.', 'A: நாளை சந்திப்போம். B: போய் வாருங்கள்! கவனமாக இருங்கள்.', ['Welcome', 'Sorry', 'Please'], '"Goodbye" is what we say when we leave.'],
  ['A: May I {come} in? B: Yes, please come in.', 'A: நான் உள்ளே வரலாமா? B: ஆம், தயவுசெய்து உள்ளே வாருங்கள்.', ['comes', 'coming', 'came'], 'After "may I" we use the base verb.'],
  ['A: What do you {do}? B: I am a teacher.', 'A: நீங்கள் என்ன வேலை செய்கிறீர்கள்? B: நான் ஒரு ஆசிரியர்.', ['does', 'did', 'doing'], '"What do you do?" asks about someone\'s job.'],
  ['A: Is this seat {free}? B: Yes, you can sit here.', 'A: இந்த இருக்கை காலியாக உள்ளதா? B: ஆம், நீங்கள் இங்கே உட்காரலாம்.', ['cheap', 'long', 'tall'], '"Free" here means "not taken".'],
  ['A: I have a fever. B: You should {see} a doctor.', 'A: எனக்குக் காய்ச்சல். B: நீங்கள் மருத்துவரைப் பார்க்க வேண்டும்.', ['sees', 'seeing', 'saw'], 'After "should" we use the base verb.'],
  ['A: Shall we go for a walk? B: Yes, {let} us go.', 'A: நடக்கப் போகலாமா? B: ஆம், போகலாம்.', ['lets', 'letting', 'left'], '"Let us go" (let\'s go) is a friendly suggestion.'],
  ['A: Happy birthday! B: {Thank} you so much!', 'A: பிறந்தநாள் வாழ்த்துகள்! B: மிக்க நன்றி!', ['Sorry', 'Welcome', 'Please'], 'We reply to good wishes with "thank you".'],
];

// ------------------------------------------------------------------------------------------------------------------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Puts the four options in a fixed but mixed order, so the right answer is not always first. */
function mixOptions(id: string, options: string[]): string[] {
  const list = [...options];
  let h = hash(id);
  for (let i = list.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const j = h % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function fromSrc(category: BlankCategory, prefix: string, rows: Src[]): BlankQuestion[] {
  return rows.map(([sentence, ta, wrong, explain, alts], i) => {
    const main = /\{([^}]+)\}/.exec(sentence)?.[1] ?? '';
    const id = `${prefix}${String(i + 1).padStart(2, '0')}`;
    return {
      id, category,
      blank: sentence.replace(/\{[^}]+\}/, '____'),
      full: sentence.replace(/\{([^}]+)\}/, '$1'),
      ta,
      options: mixOptions(id, [main, ...wrong]),
      answers: [main, ...(alts ?? [])],
      explain,
      explainTa: CATEGORY_TAMIL[category],
    };
  });
}

// ----- verb forms made from the 12 tense lessons -----

/** Past forms and participles that are not regular. Also used to find the base verb of a word. */
const IRR: Record<string, [past: string, pp: string]> = {
  be: ['was', 'been'], buy: ['bought', 'bought'], come: ['came', 'come'], do: ['did', 'done'], drink: ['drank', 'drunk'],
  eat: ['ate', 'eaten'], get: ['got', 'got'], give: ['gave', 'given'], go: ['went', 'gone'], have: ['had', 'had'],
  leave: ['left', 'left'], lose: ['lost', 'lost'], make: ['made', 'made'], meet: ['met', 'met'], read: ['read', 'read'],
  see: ['saw', 'seen'], sleep: ['slept', 'slept'], take: ['took', 'taken'], write: ['wrote', 'written'], arrive: ['arrived', 'arrived'],
  wake: ['woke', 'woken'], run: ['ran', 'run'], begin: ['began', 'begun'], know: ['knew', 'known'],
};

const E_VERBS = new Set(['arrive', 'close', 'live', 'love', 'make', 'move', 'take', 'write', 'use', 'change', 'share', 'hope', 'like', 'give', 'have', 'come', 'leave', 'drive', 'ride', 'smile', 'decide', 'prepare', 'complete', 'continue', 'save', 'wake', 'type', 'receive', 'practise', 'organise', 'invite']);

function consonant(c: string): boolean { return /[bcdfghjklmnpqrstvwxyz]/.test(c); }

/** The forms of a verb: base, third person (s), -ing, past, past participle. Used only for distractors. */
export function verbForms(base: string): { base: string; s: string; ing: string; past: string; pp: string } {
  const b = base.toLowerCase();
  const s = b === 'have' ? 'has' : /(s|sh|ch|x|z|o)$/.test(b) ? `${b}es` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ies` : `${b}s`;
  const stem = b.endsWith('ie') ? `${b.slice(0, -2)}y` : b.endsWith('e') && !b.endsWith('ee') ? b.slice(0, -1) : b;
  const double = /^[^aeiou]*[aeiou][bdgmnprt]$/.test(b) && b.length <= 4 && !E_VERBS.has(b);
  const ing = `${double ? stem + stem.slice(-1) : stem}ing`;
  const regular = b.endsWith('e') ? `${b}d` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ied` : double ? `${b}${b.slice(-1)}ed` : `${b}ed`;
  const [past, pp] = IRR[b] ?? [regular, regular];
  return { base: b, s, ing, past, pp };
}

/** The base verb that produces `word` as the given form (so "finished" → "finish", "studying" → "study"). */
function baseOf(word: string, form: 'ing' | 'past' | 'pp' | 's'): string | null {
  const w = word.toLowerCase();
  for (const b of Object.keys(IRR)) if (verbForms(b)[form] === w) return b;
  const candidates = new Set<string>();
  const strip = (suffix: string) => (w.endsWith(suffix) ? w.slice(0, -suffix.length) : null);
  const stems = form === 'ing' ? [strip('ing')] : form === 's' ? [strip('es'), strip('s'), w.endsWith('ies') ? `${w.slice(0, -3)}y` : null] : [strip('ed'), strip('d'), w.endsWith('ied') ? `${w.slice(0, -3)}y` : null];
  for (const st of stems) {
    if (!st) continue;
    candidates.add(st); candidates.add(`${st}e`);
    if (st.length > 2 && st.slice(-1) === st.slice(-2, -1)) candidates.add(st.slice(0, -1));
  }
  const ok = [...candidates].filter((c) => c.length > 1 && verbForms(c)[form] === w);
  if (!ok.length) return null;
  return ok.find((c) => E_VERBS.has(c)) ?? ok.find((c) => !c.endsWith('e')) ?? ok[0];
}

/**
 * Verb-form questions from the tense lessons: the helping verb stays, the main verb form is blanked.
 * Only sentences whose verb form could be worked out and checked are used.
 */
function tenseQuestions(): BlankQuestion[] {
  const out: BlankQuestion[] = [];
  const seen = new Set<string>();
  const sentences: { tense: string; name: string; usage: string; usageTa: string; en: string; ta: string }[] = [];
  for (const l of TENSE_LESSONS) {
    for (const e of l.examples) sentences.push({ tense: l.id, name: l.name, usage: l.usage, usageTa: l.usageTa, en: e.en, ta: e.ta });
  }
  for (const s of sentences) {
    if (seen.has(s.en) || /\?$/.test(s.en)) continue;
    const words = s.en.replace(/[.!]$/, '').split(' ');
    let idx = -1;
    let form: 'ing' | 'past' | 'pp' | 'base' = 'ing';
    for (let i = 1; i < words.length; i++) {
      const w = words[i].toLowerCase();
      const prev = words[i - 1].toLowerCase();
      if (/^(am|is|are|was|were|been|be)$/.test(prev) && /ing$/.test(w) && baseOf(w, 'ing')) { idx = i; form = 'ing'; break; }
      if (/^(have|has|had)$/.test(prev) && baseOf(w, 'pp') && !/^(been)$/.test(w)) { idx = i; form = 'pp'; break; }
      if (prev === 'will' && s.tense === 'future-simple' && /^[a-z]+$/.test(w) && w !== 'be' && w !== 'have' && w !== 'not') { idx = i; form = 'base'; break; }
      // Past simple only when the sentence names a past time, so no other tense could also fit.
      if (s.tense === 'past-simple' && i === 1 && baseOf(w, 'past') && /\b(yesterday|last|ago|in (19|20)\d\d)\b/i.test(s.en)) { idx = i; form = 'past'; break; }
    }
    if (idx < 0) continue;
    const answer = words[idx];
    const lower = answer.toLowerCase();
    const base = form === 'base' ? lower : baseOf(lower, form === 'ing' ? 'ing' : form === 'pp' ? 'pp' : 'past');
    if (!base || /([bcdfghjkmnpqrtvwxz])\1$/.test(base) || base.endsWith('ll') && base !== 'call' && base !== 'fill') continue;
    const f = verbForms(base);
    const pool = [f.base, f.s, f.ing, f.past, f.pp].filter((x, i, a) => a.indexOf(x) === i && x !== lower);
    // Prefer wrong forms that are different from each other and do not look like the right answer.
    const wrong = pool.slice(0, 3);
    if (wrong.length < 3) continue;
    const id = `tv${String(out.length + 1).padStart(2, '0')}`;
    seen.add(s.en);
    const full = s.en;
    const blank = words.map((w, i) => (i === idx ? '____' : w)).join(' ') + (/[.!]$/.test(s.en) ? s.en.slice(-1) : '');
    out.push({
      id, category: 'verbs', blank, full, ta: s.ta,
      options: mixOptions(id, [answer, ...wrong]),
      answers: [answer],
      explain: `${s.name}: ${s.usage}`,
      explainTa: s.usageTa,
    });
  }
  return out;
}

/** Prepositions that can often replace each other in a sentence. A wrong option is never taken from the answer's own group. */
const SIMILAR_GROUPS: string[][] = [
  ['in', 'into', 'inside', 'within'], ['on', 'onto', 'over', 'above', 'upon'], ['at', 'by', 'near', 'next to', 'beside', 'close to'],
  ['to', 'towards', 'toward', 'into', 'onto'], ['with', 'by', 'along', 'beside'], ['between', 'among', 'amongst'], ['for', 'during', 'since', 'within'],
  ['from', 'off', 'out of'], ['about', 'of', 'around'], ['under', 'below', 'beneath'], ['before', 'by', 'until'], ['after', 'behind', 'past'],
  ['across', 'through', 'over', 'along'], ['despite', 'in spite of'], ['because of', 'due to', 'owing to'], ['instead of', 'in place of'],
  ['outside', 'out of'], ['without', 'except'], ['against', 'beside'], ['beyond', 'past'], ['like', 'as'],
];
const WRONG_POOL = ['in', 'on', 'at', 'to', 'for', 'from', 'with', 'of', 'about', 'under', 'over', 'between', 'before', 'after', 'during', 'through', 'against', 'without', 'across', 'behind', 'above', 'below', 'since', 'into', 'by'];

function prepositionQuestions(): BlankQuestion[] {
  const out: BlankQuestion[] = [];
  for (const lesson of PREPOSITION_LESSONS) {
    lesson.questions.forEach((q, i) => {
      const id = `pp-${lesson.word.replace(/\s+/g, '_')}-${i + 1}`;
      const accepted = q.answers.map((a) => a.toLowerCase());
      const blocked = new Set<string>(accepted);
      for (const g of SIMILAR_GROUPS) if (g.some((w) => accepted.includes(w))) g.forEach((w) => blocked.add(w));
      const start = hash(id) % WRONG_POOL.length;
      const wrong: string[] = [];
      for (let k = 0; wrong.length < 3 && k < WRONG_POOL.length; k++) {
        const w = WRONG_POOL[(start + k) % WRONG_POOL.length];
        if (!blocked.has(w)) wrong.push(w);
      }
      if (wrong.length < 3) return;
      const main = q.answers[0];
      const cap = /^[A-Z]/.test(main);
      out.push({
        id, category: 'prepositions', blank: q.blank, full: q.full, ta: q.ta,
        options: mixOptions(id, [main, ...wrong.map((w) => (cap ? w.charAt(0).toUpperCase() + w.slice(1) : w))]),
        answers: q.answers,
        explain: lesson.usage,
        explainTa: lesson.usageTa,
      });
    });
  }
  return out;
}

let cache: BlankQuestion[] | null = null;

/** All fill-in-the-blank questions, in a fixed order: categories one after another. Practice mixes them with a seeded shuffle. */
export function buildBlankBank(): BlankQuestion[] {
  if (cache) return cache;
  const all = [
    ...fromSrc('everyday', 'ev', EVERYDAY),
    ...fromSrc('verbs', 'vb', VERBS),
    ...tenseQuestions(),
    ...prepositionQuestions(),
    ...fromSrc('articles', 'ar', ARTICLES),
    ...fromSrc('pronouns', 'pn', PRONOUNS),
    ...fromSrc('conjunctions', 'cj', CONJUNCTIONS),
    ...fromSrc('vocabulary', 'vc', VOCABULARY),
    ...fromSrc('conversation', 'cv', CONVERSATION),
  ];
  // Never two questions with the same sentence.
  const seen = new Set<string>();
  cache = all.filter((q) => {
    const key = q.full.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return cache;
}

function norm(text: string): string {
  return text.toLocaleLowerCase().normalize('NFKC').replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Is the typed (or tapped) answer correct? Accepts the main answer, listed alternatives, and the whole sentence typed out. */
export function isBlankAnswerCorrect(typed: string, q: BlankQuestion): boolean {
  const given = norm(typed);
  if (!given) return false;
  if (q.answers.some((a) => norm(a) === given)) return true;
  if (norm(q.full) === given) return true;
  // "No article" can also be typed as "no", "none" or "-".
  if (q.answers.some((a) => norm(a) === 'no article') && ['no', 'none', 'nothing'].includes(given)) return true;
  return false;
}
