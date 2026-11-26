// Built-in preposition lessons for Lela (Tamil + English). Pure data and pure functions: no Angular, no network.
//
// Why this file exists: the chat used to load `data/prepositions-500.json`. That file was missing from the project,
// so the dropdown was empty. The lessons below are bundled into the app, so the dropdown can never be empty again.
// If `public/data/prepositions-500.json` is ever restored, the chat merges its extra words in (see mergeExtraPrepositions).

export interface PrepExample { en: string; ta: string; why: string }
export interface PrepQuestion {
  /** Original lesson word, set when questions are combined into a mixed practice bank. */
  lessonWord?: string;
  /** Sentence with ____ where the preposition goes. */
  blank: string;
  /** The full, correct sentence. */
  full: string;
  ta: string;
  /** Every answer that is correct in this sentence (the first one is the main answer). */
  answers: string[];
}
export interface PrepLesson {
  word: string;
  tamil: string;
  usage: string;
  usageTa: string;
  examples: PrepExample[];
  questions: PrepQuestion[];
}

/** Compact source form. In a question sentence the correct word is written in braces: "The book is {on} the table." */
type Src = [
  word: string, tamil: string, usage: string, usageTa: string,
  examples: [en: string, ta: string, why: string][],
  questions: ([sentence: string, ta: string] | [sentence: string, ta: string, alts: string[]])[],
];

const SRC: Src[] = [
  ['in', 'உள்ளே; (மாதம்/ஆண்டு/ஊர்) இல்', 'Use "in" for inside a space, for cities and countries, and for months, years and long periods.', 'இடத்தின் உள்ளே, ஊர்/நாடு, மாதம்/ஆண்டு/நீண்ட காலம் என்பதற்கு "in" பயன்படுத்துவோம்.',
    [['The keys are in my bag.', 'சாவிகள் என் பையில் இருக்கின்றன.', 'The keys are inside the bag, so we use "in".'],
     ['She lives in Chennai.', 'அவள் சென்னையில் வசிக்கிறாள்.', 'We use "in" with cities and countries.'],
     ['My birthday is in June.', 'என் பிறந்தநாள் ஜூன் மாதத்தில் உள்ளது.', 'We use "in" with months and years.']],
    [['There is some water {in} the bottle.', 'பாட்டிலில் கொஞ்சம் தண்ணீர் இருக்கிறது.'], ['We moved to Madurai {in} 2019.', 'நாங்கள் 2019-ல் மதுரைக்குக் குடிபெயர்ந்தோம்.'], ['He works {in} a bank.', 'அவர் ஒரு வங்கியில் வேலை செய்கிறார்.']]],
  ['on', 'மேல் / மீது; (கிழமை/தேதி) அன்று', 'Use "on" for a surface, for days and dates, and for devices or transport such as "on the phone", "on the bus".', 'பரப்பின் மேல், கிழமை/தேதி, தொலைபேசி/பேருந்து போன்றவற்றுக்கு "on" பயன்படுத்துவோம்.',
    [['The book is on the table.', 'புத்தகம் மேசை மேல் உள்ளது.', 'The book touches the surface of the table, so we use "on".'],
     ['We have a meeting on Monday.', 'திங்கட்கிழமை எங்களுக்குக் கூட்டம் இருக்கிறது.', 'We use "on" with days and dates.'],
     ['She is talking on the phone.', 'அவள் தொலைபேசியில் பேசிக்கொண்டிருக்கிறாள்.', '"On the phone" is a fixed phrase.']],
    [['Please put the cup {on} the shelf.', 'தயவுசெய்து கோப்பையை அலமாரியில் வையுங்கள்.'], ['My exam is {on} 15 March.', 'என் தேர்வு மார்ச் 15 அன்று.'], ['I saw him {on} the bus.', 'நான் அவரைப் பேருந்தில் பார்த்தேன்.']]],
  ['at', 'ஓரிடத்தில்; (நேரம்) மணிக்கு', 'Use "at" for an exact point or place (at the door, at school) and for clock times.', 'குறிப்பிட்ட புள்ளி/இடம் (வாசலில், பள்ளியில்) மற்றும் நேரம் (மணிக்கு) என்பதற்கு "at" பயன்படுத்துவோம்.',
    [['I will meet you at the station.', 'நான் உங்களை ரயில் நிலையத்தில் சந்திப்பேன்.', 'The station is a point where we meet, so we use "at".'],
     ['The class starts at nine o\'clock.', 'வகுப்பு ஒன்பது மணிக்குத் தொடங்கும்.', 'We use "at" with clock times.'],
     ['He is waiting at the door.', 'அவர் வாசலில் காத்திருக்கிறார்.', '"At the door" shows a specific point.']],
    [['The children are {at} school now.', 'குழந்தைகள் இப்போது பள்ளியில் இருக்கிறார்கள்.'], ['We have lunch {at} one o\'clock.', 'நாங்கள் ஒரு மணிக்கு மதிய உணவு சாப்பிடுவோம்.'], ['Someone is {at} the gate.', 'யாரோ கதவருகில் (வாசலில்) நிற்கிறார்கள்.']]],
  ['under', 'கீழே', 'Use "under" when something is directly below another thing, often covered by it.', 'ஒன்று மற்றொன்றின் நேர் கீழே (மூடியபடி) இருந்தால் "under" பயன்படுத்துவோம்.',
    [['The cat is under the table.', 'பூனை மேசைக்குக் கீழே இருக்கிறது.', 'The cat is directly below the table.'],
     ['He hid the letter under the pillow.', 'அவன் கடிதத்தை தலையணைக்குக் கீழே ஒளித்து வைத்தான்.', 'The letter is covered by the pillow.'],
     ['Children under five travel free.', 'ஐந்து வயதுக்குக் குறைவான குழந்தைகள் இலவசமாகப் பயணிக்கலாம்.', '"Under" also means less than an age or number.']],
    [['The shoes are {under} the bed.', 'காலணிகள் கட்டிலுக்குக் கீழே உள்ளன.', ['beneath', 'below']], ['She put the bag {under} her seat.', 'அவள் பையை இருக்கைக்குக் கீழே வைத்தாள்.', ['beneath']], ['The dog is sleeping {under} the tree.', 'நாய் மரத்தின் கீழே தூங்குகிறது.', ['beneath']]]],
  ['over', 'மேலே / மேல் கடந்து', 'Use "over" for above something, covering it, or moving across the top of it.', 'ஒன்றின் மேலே, மூடியபடி அல்லது மேல் வழியாகக் கடந்து செல்வதற்கு "over" பயன்படுத்துவோம்.',
    [['A plane flew over the city.', 'ஒரு விமானம் நகரின் மேலே பறந்தது.', 'The plane passed above the city.'],
     ['She put a blanket over the child.', 'அவள் குழந்தை மேல் போர்வை போர்த்தினாள்.', 'The blanket covers the child, so we use "over".'],
     ['We walked over the bridge.', 'நாங்கள் பாலத்தின் மேல் நடந்து கடந்தோம்.', '"Over" shows movement across the top of something.']],
    [['The lamp hangs {over} the table.', 'விளக்கு மேசைக்கு மேலே தொங்குகிறது.', ['above']], ['He jumped {over} the wall.', 'அவன் சுவரைத் தாண்டிக் குதித்தான்.'], ['Put a cloth {over} the food.', 'உணவின் மேல் ஒரு துணியைப் போடுங்கள்.']]],
  ['above', 'மேலே (தொடாமல்)', 'Use "above" when something is higher than another thing, usually not touching it.', 'ஒன்று மற்றொன்றை விட உயரத்தில் (தொடாமல்) இருந்தால் "above" பயன்படுத்துவோம்.',
    [['The clock is above the door.', 'கடிகாரம் கதவுக்கு மேலே உள்ளது.', 'The clock is higher than the door.'],
     ['The temperature is above thirty degrees.', 'வெப்பநிலை முப்பது டிகிரிக்கு மேல் உள்ளது.', '"Above" can mean higher than a number.'],
     ['Read the sentence above.', 'மேலே உள்ள வாக்கியத்தைப் படியுங்கள்.', '"Above" can mean earlier on the page.']],
    [['The picture is {above} the sofa.', 'படம் சோபாவுக்கு மேலே உள்ளது.', ['over']], ['The birds are flying {above} the trees.', 'பறவைகள் மரங்களுக்கு மேலே பறக்கின்றன.', ['over']], ['Her marks are {above} average.', 'அவளுடைய மதிப்பெண்கள் சராசரிக்கு மேல்.']]],
  ['below', 'கீழே (தொடாமல்)', 'Use "below" when something is lower than another thing.', 'ஒன்று மற்றொன்றை விடக் கீழே இருந்தால் "below" பயன்படுத்துவோம்.',
    [['The kitchen is below my room.', 'சமையலறை என் அறைக்குக் கீழே உள்ளது.', 'The kitchen is on a lower floor.'],
     ['The temperature is below zero.', 'வெப்பநிலை பூஜ்யத்துக்குக் கீழே உள்ளது.', '"Below" can mean lower than a number.'],
     ['Please sign below.', 'தயவுசெய்து கீழே கையொப்பமிடுங்கள்.', '"Below" can mean lower on the page.']],
    [['The sun went {below} the horizon.', 'சூரியன் அடிவானத்திற்குக் கீழே சென்றது.'], ['Write your name {below} the line.', 'கோட்டுக்குக் கீழே உங்கள் பெயரை எழுதுங்கள்.', ['under']], ['The water level is {below} normal.', 'நீர் மட்டம் இயல்பை விடக் குறைவாக உள்ளது.']]],
  ['between', 'இரண்டுக்கு இடையில்', 'Use "between" for two things, people or times.', 'இரண்டு பொருட்கள்/நபர்கள்/நேரங்களுக்கு இடையில் என்பதற்கு "between" பயன்படுத்துவோம்.',
    [['The shop is between the bank and the school.', 'கடை வங்கிக்கும் பள்ளிக்கும் இடையில் உள்ளது.', 'There are two places, the bank and the school.'],
     ['Choose between tea and coffee.', 'தேநீர் அல்லது காபி இவற்றில் ஒன்றைத் தேர்ந்தெடுங்கள்.', 'We choose from two things.'],
     ['I am free between two and four.', 'நான் இரண்டு மணிக்கும் நான்கு மணிக்கும் இடையில் ஓய்வாக இருக்கிறேன்.', '"Between" is used for two times.']],
    [['She sat {between} her mother and her father.', 'அவள் அம்மாவுக்கும் அப்பாவுக்கும் இடையில் அமர்ந்தாள்.'], ['This is a secret {between} you and me.', 'இது உனக்கும் எனக்கும் இடையிலான ரகசியம்.'], ['The train runs {between} Chennai and Madurai.', 'ரயில் சென்னைக்கும் மதுரைக்கும் இடையில் ஓடுகிறது.']]],
  ['among', 'பலருக்கு/பலவற்றுக்கு இடையில்', 'Use "among" for three or more people or things in a group.', 'மூன்று அல்லது அதற்கு மேற்பட்டவர்கள்/பொருட்களின் கூட்டத்துக்கு நடுவில் என்பதற்கு "among" பயன்படுத்துவோம்.',
    [['She is the best among all the students.', 'எல்லா மாணவர்களிலும் அவளே சிறந்தவள்.', 'There are many students, so we use "among".'],
     ['The house is among the trees.', 'வீடு மரங்களுக்கு நடுவில் உள்ளது.', 'The house is surrounded by many trees.'],
     ['Share the sweets among the children.', 'இனிப்புகளைக் குழந்தைகளுக்குள் பகிருங்கள்.', 'We share with a group of three or more.']],
    [['Ravi is popular {among} his friends.', 'ரவி தன் நண்பர்களிடையே பிரபலமாக இருக்கிறார்.', ['amongst']], ['There was a thief {among} the crowd.', 'கூட்டத்தில் ஒரு திருடன் இருந்தான்.', ['in', 'amongst']], ['Divide the work {among} the four of us.', 'வேலையை எங்கள் நால்வருக்குள் பிரித்துக்கொள்ளுங்கள்.']]],
  ['beside', 'பக்கத்தில்', 'Use "beside" for at the side of someone or something.', 'ஒருவர்/ஒன்றின் பக்கத்தில் என்பதற்கு "beside" பயன்படுத்துவோம்.',
    [['She is sitting beside me.', 'அவள் என் பக்கத்தில் உட்கார்ந்திருக்கிறாள்.', 'She is at my side.'],
     ['The pen is beside the book.', 'பேனா புத்தகத்தின் பக்கத்தில் உள்ளது.', 'The pen is at the side of the book.'],
     ['There is a park beside the river.', 'ஆற்றின் அருகில் ஒரு பூங்கா உள்ளது.', '"Beside" shows the side of something.']],
    [['Come and sit {beside} me.', 'வந்து என் பக்கத்தில் உட்காருங்கள்.', ['next to', 'by']], ['The bike is parked {beside} the wall.', 'பைக் சுவரின் ஓரத்தில் நிறுத்தப்பட்டுள்ளது.', ['next to', 'by', 'against']], ['He stood {beside} the door.', 'அவன் கதவின் ஓரத்தில் நின்றான்.', ['next to', 'by']]]],
  ['behind', 'பின்னால்', 'Use "behind" for at the back of someone or something.', 'ஒருவர்/ஒன்றின் பின்புறம் என்பதற்கு "behind" பயன்படுத்துவோம்.',
    [['The garden is behind the house.', 'தோட்டம் வீட்டின் பின்னால் உள்ளது.', 'The garden is at the back of the house.'],
     ['Don\'t hide behind the door.', 'கதவுக்குப் பின்னால் ஒளியாதே.', 'Hiding at the back of the door.'],
     ['We are behind schedule.', 'நாங்கள் திட்டமிட்ட நேரத்தை விடத் தாமதமாக இருக்கிறோம்.', '"Behind schedule" means late.']],
    [['The cat is hiding {behind} the sofa.', 'பூனை சோபாவுக்குப் பின்னால் ஒளிந்திருக்கிறது.'], ['Who is standing {behind} you?', 'உங்களுக்குப் பின்னால் யார் நிற்கிறார்கள்?'], ['The sun disappeared {behind} the clouds.', 'சூரியன் மேகங்களுக்குப் பின்னால் மறைந்தது.']]],
  ['before', 'முன்பு', 'Use "before" for earlier than a time or an action.', 'ஒரு நேரம்/செயலுக்கு முன்பு என்பதற்கு "before" பயன்படுத்துவோம்.',
    [['Wash your hands before lunch.', 'மதிய உணவுக்கு முன் கைகளைக் கழுவுங்கள்.', 'Washing happens earlier than lunch.'],
     ['I get up before six.', 'நான் ஆறு மணிக்கு முன் எழுந்துவிடுவேன்.', '"Before six" means earlier than six.'],
     ['Call me before you leave.', 'நீங்கள் புறப்படுவதற்கு முன் எனக்கு அழைப்பு செய்யுங்கள்.', 'The call comes earlier than leaving.']],
    [['Brush your teeth {before} bed.', 'தூங்கச் செல்வதற்கு முன் பல் துலக்குங்கள்.'], ['She arrived {before} me.', 'அவள் எனக்கு முன்பாக வந்தாள்.'], ['Please finish this {before} Friday.', 'தயவுசெய்து இதை வெள்ளிக்கிழமைக்கு முன் முடியுங்கள்.', ['by']]]],
  ['after', 'பிறகு', 'Use "after" for later than a time or an action.', 'ஒரு நேரம்/செயலுக்குப் பிறகு என்பதற்கு "after" பயன்படுத்துவோம்.',
    [['We play cricket after school.', 'பள்ளி முடிந்த பிறகு நாங்கள் கிரிக்கெட் விளையாடுவோம்.', 'Playing happens later than school.'],
     ['Call me after dinner.', 'இரவு உணவுக்குப் பிறகு எனக்கு அழைப்பு செய்யுங்கள்.', 'The call is later than dinner.'],
     ['After the meeting, we had tea.', 'கூட்டத்துக்குப் பிறகு நாங்கள் தேநீர் குடித்தோம்.', '"After" starts the sentence to show the later action.']],
    [['I feel tired {after} work.', 'வேலைக்குப் பிறகு எனக்குக் களைப்பாக இருக்கிறது.'], ['Let\'s go out {after} the rain.', 'மழை நின்ற பிறகு வெளியே போகலாம்.'], ['He called me {after} midnight.', 'அவன் நள்ளிரவுக்குப் பிறகு எனக்கு அழைத்தான்.']]],
  ['during', 'ஒரு காலத்தின் போது', 'Use "during" for something that happens inside a period of time, such as a meeting or a holiday.', 'கூட்டம்/விடுமுறை போன்ற ஒரு காலத்தின் நடுவே நடப்பதற்கு "during" பயன்படுத்துவோம்.',
    [['Please be quiet during the lesson.', 'பாடத்தின் போது தயவுசெய்து அமைதியாக இருங்கள்.', 'The quiet time is inside the lesson.'],
     ['We visited many places during the holidays.', 'விடுமுறையின் போது நாங்கள் பல இடங்களுக்குச் சென்றோம்.', 'The visits happened inside the holiday period.'],
     ['He fell asleep during the film.', 'படம் ஓடிக்கொண்டிருந்தபோது அவன் தூங்கிவிட்டான்.', 'He slept at some point inside the film.']],
    [['Don\'t use your phone {during} the exam.', 'தேர்வின் போது தொலைபேசியைப் பயன்படுத்தாதீர்கள்.'], ['It rained heavily {during} the night.', 'இரவில் கனமழை பெய்தது.', ['in', 'at']], ['She learned English {during} her stay in London.', 'லண்டனில் தங்கியிருந்த காலத்தில் அவள் ஆங்கிலம் கற்றாள்.']]],
  ['since', 'இருந்து (தொடக்கப் புள்ளி)', 'Use "since" with a starting point in time (since 2020, since Monday). It is often used with the present perfect.', 'தொடங்கிய நேரத்தைச் சொல்ல (2020 முதல், திங்கள் முதல்) "since" பயன்படுத்துவோம். இது பெரும்பாலும் Present Perfect உடன் வரும்.',
    [['I have lived here since 2018.', 'நான் 2018 முதல் இங்கு வசிக்கிறேன்.', '2018 is the starting point.'],
     ['She has been ill since Monday.', 'அவள் திங்கட்கிழமையிலிருந்து உடல்நலமின்றி இருக்கிறாள்.', 'Monday is the starting point.'],
     ['It has been raining since morning.', 'காலையிலிருந்து மழை பெய்துகொண்டிருக்கிறது.', '"Since morning" gives the starting time.']],
    [['We have known each other {since} childhood.', 'நாங்கள் சிறுவயதிலிருந்தே ஒருவரை ஒருவர் அறிவோம்.'], ['He has worked here {since} January.', 'அவர் ஜனவரி முதல் இங்கு வேலை செய்கிறார்.'], ['I haven\'t eaten {since} breakfast.', 'காலை உணவுக்குப் பிறகு நான் சாப்பிடவில்லை.']]],
  ['for', 'க்காக; (கால அளவு) ஆக', 'Use "for" with a length of time (for two hours), and to show a purpose or the person who gets something.', 'கால அளவு (இரண்டு மணி நேரமாக), நோக்கம் அல்லது யாருக்காக என்பதைச் சொல்ல "for" பயன்படுத்துவோம்.',
    [['I have waited for two hours.', 'நான் இரண்டு மணி நேரமாகக் காத்திருக்கிறேன்.', '"Two hours" is a length of time.'],
     ['This gift is for you.', 'இந்தப் பரிசு உங்களுக்காக.', '"For you" shows who receives the gift.'],
     ['We use a pen for writing.', 'எழுதுவதற்காக நாங்கள் பேனாவைப் பயன்படுத்துகிறோம்.', '"For" shows the purpose.']],
    [['She has studied English {for} three years.', 'அவள் மூன்று ஆண்டுகளாக ஆங்கிலம் படிக்கிறாள்.'], ['I bought a shirt {for} my brother.', 'நான் என் தம்பிக்காக ஒரு சட்டை வாங்கினேன்.'], ['Thank you {for} your help.', 'உங்கள் உதவிக்கு நன்றி.']]],
  ['from', 'இருந்து', 'Use "from" for the starting point of a place, a time or an origin.', 'இடம், நேரம் அல்லது பிறப்பிடத்தின் தொடக்கத்தைச் சொல்ல "from" பயன்படுத்துவோம்.',
    [['I am from Tamil Nadu.', 'நான் தமிழ்நாட்டைச் சேர்ந்தவன்.', '"From" shows where you come from.'],
     ['The shop is open from nine to five.', 'கடை ஒன்பது முதல் ஐந்து வரை திறந்திருக்கும்.', '"From" gives the starting time.'],
     ['She got a letter from her friend.', 'அவளுக்கு நண்பரிடமிருந்து கடிதம் வந்தது.', '"From" shows who sent it.']],
    [['This train comes {from} Coimbatore.', 'இந்த ரயில் கோயம்புத்தூரிலிருந்து வருகிறது.'], ['I work {from} Monday to Friday.', 'நான் திங்கள் முதல் வெள்ளி வரை வேலை செய்கிறேன்.'], ['Milk comes {from} cows.', 'பால் பசுக்களிடமிருந்து கிடைக்கிறது.']]],
  ['to', 'க்கு; நோக்கி', 'Use "to" for direction, the person who receives something, and the end point of a journey.', 'திசை, பெறுபவர் அல்லது பயணத்தின் முடிவிடத்தைச் சொல்ல "to" பயன்படுத்துவோம்.',
    [['I go to the office by bus.', 'நான் பேருந்தில் அலுவலகத்திற்குச் செல்கிறேன்.', 'The office is the place I travel towards.'],
     ['Give the book to Meena.', 'புத்தகத்தை மீனாவிடம் கொடுங்கள்.', 'Meena receives the book.'],
     ['She wrote a letter to her uncle.', 'அவள் தன் மாமாவுக்குக் கடிதம் எழுதினாள்.', 'The uncle receives the letter.']],
    [['We are going {to} the market.', 'நாங்கள் சந்தைக்குப் போகிறோம்.'], ['Please send this message {to} Raj.', 'தயவுசெய்து இந்தச் செய்தியை ராஜுக்கு அனுப்புங்கள்.'], ['He walked {to} the bus stop.', 'அவன் பேருந்து நிறுத்தத்திற்கு நடந்து சென்றான்.', ['towards']]]],
  ['with', 'உடன்; (கருவி) கொண்டு', 'Use "with" for together with someone, and for the tool or thing you use.', 'ஒருவருடன் சேர்ந்து, அல்லது பயன்படுத்தும் கருவியைச் சொல்ல "with" பயன்படுத்துவோம்.',
    [['I live with my parents.', 'நான் என் பெற்றோருடன் வசிக்கிறேன்.', '"With" means together with.'],
     ['She cut the fruit with a knife.', 'அவள் கத்தியால் பழத்தை வெட்டினாள்.', 'The knife is the tool she used.'],
     ['Tea with milk, please.', 'பாலுடன் தேநீர் கொடுங்கள்.', '"With" shows what is included.']],
    [['Can I go {with} you?', 'நான் உங்களுடன் வரலாமா?'], ['He wrote the letter {with} a red pen.', 'அவன் சிவப்புப் பேனாவால் கடிதம் எழுதினான்.'], ['I am happy {with} my result.', 'என் முடிவில் நான் மகிழ்ச்சியாக இருக்கிறேன்.']]],
  ['without', 'இல்லாமல்', 'Use "without" when something or someone is not there.', 'ஒன்று/ஒருவர் இல்லாமல் என்பதற்கு "without" பயன்படுத்துவோம்.',
    [['I drink tea without sugar.', 'நான் சர்க்கரை இல்லாமல் தேநீர் குடிக்கிறேன்.', 'There is no sugar in the tea.'],
     ['Don\'t go out without an umbrella.', 'குடை இல்லாமல் வெளியே போகாதீர்கள்.', 'You do not have an umbrella.'],
     ['He left without saying goodbye.', 'அவன் விடைபெறாமல் சென்றுவிட்டான்.', '"Without" + verb-ing means not doing something.']],
    [['I can\'t live {without} music.', 'இசை இல்லாமல் என்னால் வாழ முடியாது.'], ['She came {without} her phone.', 'அவள் தொலைபேசி இல்லாமல் வந்தாள்.'], ['Don\'t start {without} me.', 'என்னை விட்டுவிட்டுத் தொடங்காதீர்கள்.']]],
  ['by', 'அருகில்; (வாகனம்) மூலம்; (நேரம்) க்குள்', 'Use "by" for near something, for ways of travelling (by bus), for who did something, and for a deadline.', 'அருகில், பயண வழி (பேருந்தில்), செய்தவர், மற்றும் காலக்கெடு (க்குள்) என்பதற்கு "by" பயன்படுத்துவோம்.',
    [['I go to work by bus.', 'நான் பேருந்தில் வேலைக்குச் செல்கிறேன்.', '"By bus" shows the way of travelling.'],
     ['This book was written by Kalki.', 'இந்தப் புத்தகத்தை கல்கி எழுதினார்.', '"By" shows who did it.'],
     ['Please submit the form by Friday.', 'தயவுசெய்து வெள்ளிக்கிழமைக்குள் படிவத்தைச் சமர்ப்பியுங்கள்.', '"By Friday" means not later than Friday.']],
    [['We travelled {by} train.', 'நாங்கள் ரயிலில் பயணம் செய்தோம்.'], ['Finish the work {by} five o\'clock.', 'ஐந்து மணிக்குள் வேலையை முடியுங்கள்.'], ['She is sitting {by} the window.', 'அவள் ஜன்னல் அருகில் உட்கார்ந்திருக்கிறாள்.', ['beside', 'next to', 'near']]]],
  ['about', 'பற்றி', 'Use "about" for the topic of talking, thinking or reading. It can also mean "around" for numbers.', 'பேசுதல், சிந்தித்தல், படித்தல் ஆகியவற்றின் தலைப்பைச் சொல்ல "about" பயன்படுத்துவோம்.',
    [['We talked about the exam.', 'நாங்கள் தேர்வைப் பற்றிப் பேசினோம்.', 'The exam is the topic of our talk.'],
     ['She is thinking about her future.', 'அவள் தன் எதிர்காலத்தைப் பற்றி யோசிக்கிறாள்.', 'The future is what she thinks of.'],
     ['It costs about fifty rupees.', 'இதன் விலை சுமார் ஐம்பது ரூபாய்.', '"About" can mean approximately.']],
    [['Tell me {about} your family.', 'உங்கள் குடும்பத்தைப் பற்றிச் சொல்லுங்கள்.'], ['I read a book {about} space.', 'நான் விண்வெளியைப் பற்றிய ஒரு புத்தகத்தைப் படித்தேன்.'], ['Don\'t worry {about} me.', 'என்னைப் பற்றிக் கவலைப்படாதீர்கள்.']]],
  ['across', 'குறுக்கே', 'Use "across" for going from one side to the other side of something.', 'ஒரு பக்கத்திலிருந்து மறு பக்கத்துக்குக் குறுக்காகச் செல்வதற்கு "across" பயன்படுத்துவோம்.',
    [['She walked across the road.', 'அவள் சாலையைக் குறுக்காகக் கடந்து நடந்தாள்.', 'She moved from one side of the road to the other.'],
     ['There is a bank across the street.', 'தெருவுக்கு எதிர்ப்புறம் ஒரு வங்கி இருக்கிறது.', '"Across" shows the opposite side.'],
     ['He swam across the river.', 'அவன் ஆற்றின் குறுக்கே நீந்தினான்.', 'He went from one bank to the other.']],
    [['The boy ran {across} the field.', 'சிறுவன் மைதானத்தின் குறுக்கே ஓடினான்.'], ['Our school is just {across} the road.', 'எங்கள் பள்ளி சாலையின் எதிர்ப்புறமே உள்ளது.'], ['They built a bridge {across} the lake.', 'அவர்கள் ஏரியின் குறுக்கே பாலம் கட்டினார்கள்.']]],
  ['through', 'வழியாக', 'Use "through" for moving from one end to the other inside something, like a tunnel or a door.', 'சுரங்கம், கதவு போன்றவற்றின் ஒரு முனையிலிருந்து மறுமுனைக்கு உள்ளே சென்று வருவதற்கு "through" பயன்படுத்துவோம்.',
    [['The train goes through a tunnel.', 'ரயில் சுரங்கத்தின் வழியாகச் செல்கிறது.', 'It enters one end and leaves the other end.'],
     ['She looked through the window.', 'அவள் ஜன்னல் வழியாகப் பார்த்தாள்.', 'Her view passed through the window.'],
     ['We learn English through practice.', 'நாங்கள் பயிற்சியின் மூலம் ஆங்கிலம் கற்கிறோம்.', '"Through" can mean by means of.']],
    [['The river flows {through} the town.', 'ஆறு ஊரின் வழியாகப் பாய்கிறது.'], ['Light comes {through} the curtains.', 'திரைச்சீலைகள் வழியாக ஒளி வருகிறது.'], ['We drove {through} the forest.', 'நாங்கள் காட்டின் வழியாக வாகனத்தில் சென்றோம்.']]],
  ['into', 'உள்ளே (நுழைதல்)', 'Use "into" for movement from outside to inside, or for a change of form.', 'வெளியிலிருந்து உள்ளே செல்வதற்கு அல்லது வடிவம் மாறுவதற்கு "into" பயன்படுத்துவோம்.',
    [['She walked into the room.', 'அவள் அறைக்குள் நடந்து சென்றாள்.', 'She moved from outside to inside.'],
     ['Pour the milk into the glass.', 'பாலை டம்ளருக்குள் ஊற்றுங்கள்.', 'The milk moves inside the glass.'],
     ['Translate this into English.', 'இதை ஆங்கிலத்துக்கு மொழிபெயர்க்கவும்.', '"Into" shows the change to another language.']],
    [['The boy jumped {into} the pool.', 'சிறுவன் நீச்சல் குளத்துக்குள் குதித்தான்.'], ['Put the clothes {into} the bag.', 'துணிகளைப் பைக்குள் வையுங்கள்.', ['in']], ['Water turns {into} ice at zero degrees.', 'பூஜ்ய டிகிரியில் தண்ணீர் பனிக்கட்டியாக மாறும்.']]],
  ['onto', 'மேலே (ஏறுதல்)', 'Use "onto" for movement to the top of a surface.', 'ஒரு பரப்பின் மேலே செல்லும் இயக்கத்துக்கு "onto" பயன்படுத்துவோம்.',
    [['The cat jumped onto the table.', 'பூனை மேசை மேல் குதித்தது.', 'The cat moved to the top of the table.'],
     ['He climbed onto the roof.', 'அவன் கூரை மேல் ஏறினான்.', 'He moved up to the roof.'],
     ['Upload the photo onto the website.', 'புகைப்படத்தை இணையதளத்தில் பதிவேற்றுங்கள்.', 'The photo moves onto the site.']],
    [['She stepped {onto} the stage.', 'அவள் மேடை மேல் ஏறினாள்.', ['on to']], ['The glass fell {onto} the floor.', 'டம்ளர் தரையில் விழுந்தது.', ['on to', 'on']], ['Put the plate {onto} the tray.', 'தட்டை தட்டுக்கூடையின் மேல் வையுங்கள்.', ['on to', 'on']]]],
  ['against', 'எதிராக; சாய்ந்து', 'Use "against" for opposing someone or something, or for leaning on something.', 'ஒருவருக்கு எதிராக, அல்லது ஒன்றின் மேல் சாய்ந்து என்பதற்கு "against" பயன்படுத்துவோம்.',
    [['India played against Australia.', 'இந்தியா ஆஸ்திரேலியாவுக்கு எதிராக விளையாடியது.', 'The two teams are opponents.'],
     ['He leaned against the wall.', 'அவன் சுவரில் சாய்ந்து நின்றான்.', 'His body touched the wall for support.'],
     ['I am against this plan.', 'நான் இந்தத் திட்டத்துக்கு எதிரானவன்.', '"Against" shows you do not agree.']],
    [['Our team is playing {against} Chennai tonight.', 'எங்கள் அணி இன்றிரவு சென்னைக்கு எதிராக விளையாடுகிறது.'], ['The ladder is leaning {against} the tree.', 'ஏணி மரத்தின் மேல் சாய்ந்து உள்ளது.'], ['Are you {against} the idea?', 'நீங்கள் இந்த யோசனைக்கு எதிரா?']]],
  ['towards', 'நோக்கி', 'Use "towards" for moving in the direction of something. "Toward" is also correct.', 'ஒன்றின் திசையை நோக்கிச் செல்வதற்கு "towards" பயன்படுத்துவோம். "toward" என்றும் சொல்லலாம்.',
    [['She walked towards the gate.', 'அவள் வாசலை நோக்கி நடந்தாள்.', 'She moved in the direction of the gate.'],
     ['The dog ran towards me.', 'நாய் என்னை நோக்கி ஓடி வந்தது.', 'The dog moved in my direction.'],
     ['He is very kind towards animals.', 'அவர் விலங்குகளிடம் மிகவும் அன்பாக இருக்கிறார்.', '"Towards" shows attitude to someone.']],
    [['The bus is moving {towards} the city.', 'பேருந்து நகரை நோக்கிச் செல்கிறது.', ['toward', 'to']], ['Turn your face {towards} me.', 'உங்கள் முகத்தை என் பக்கம் திருப்புங்கள்.', ['toward', 'to']], ['We are walking {towards} the beach.', 'நாங்கள் கடற்கரையை நோக்கி நடக்கிறோம்.', ['toward', 'to']]]],
  ['within', 'க்குள் (எல்லை/காலம்)', 'Use "within" for inside a limit of time, distance or area.', 'நேரம், தூரம், எல்லைக்குள் என்பதற்கு "within" பயன்படுத்துவோம்.',
    [['I will reply within an hour.', 'நான் ஒரு மணி நேரத்துக்குள் பதில் சொல்வேன்.', 'The reply will come inside one hour.'],
     ['The school is within walking distance.', 'பள்ளி நடந்து செல்லும் தூரத்தில் உள்ளது.', 'It is inside a short distance.'],
     ['Stay within the line.', 'கோட்டுக்குள் இருங்கள்.', '"Within" shows a limit.']],
    [['The doctor will see you {within} ten minutes.', 'மருத்துவர் பத்து நிமிடங்களுக்குள் உங்களைப் பார்ப்பார்.'], ['Everything is {within} reach.', 'எல்லாம் கைக்கெட்டும் தூரத்தில் உள்ளது.'], ['Please stay {within} the school area.', 'தயவுசெய்து பள்ளி எல்லைக்குள் இருங்கள்.']]],
  ['beyond', 'அப்பால்', 'Use "beyond" for further than a place, a limit or what is possible.', 'ஓர் இடம்/எல்லைக்கு அப்பால், அல்லது இயலாததற்கு அப்பால் என்பதற்கு "beyond" பயன்படுத்துவோம்.',
    [['The village is beyond the hills.', 'கிராமம் மலைகளுக்கு அப்பால் உள்ளது.', 'It is further away than the hills.'],
     ['Don\'t go beyond this line.', 'இந்தக் கோட்டுக்கு அப்பால் போகாதீர்கள்.', 'It is past the limit.'],
     ['This work is beyond my ability.', 'இந்த வேலை என் திறமைக்கு அப்பாற்பட்டது.', 'It is more than I can do.']],
    [['There is a lake {beyond} the forest.', 'காட்டுக்கு அப்பால் ஒரு ஏரி உள்ளது.'], ['The shop is just {beyond} the bridge.', 'கடை பாலத்துக்கு அப்பால்தான் உள்ளது.', ['past']], ['It is {beyond} my understanding.', 'இது என் புரிதலுக்கு அப்பாற்பட்டது.']]],
  ['near', 'அருகில்', 'Use "near" for a short distance from something.', 'ஒன்றிலிருந்து குறைந்த தூரத்தில் என்பதற்கு "near" பயன்படுத்துவோம்.',
    [['My house is near the temple.', 'என் வீடு கோயிலுக்கு அருகில் உள்ளது.', 'The distance is short.'],
     ['Is there a bank near here?', 'இங்கே அருகில் வங்கி இருக்கிறதா?', '"Near here" asks about a short distance.'],
     ['Don\'t go near the fire.', 'நெருப்பின் அருகில் போகாதீர்கள்.', 'Stay at a distance from the fire.']],
    [['She lives {near} the beach.', 'அவள் கடற்கரைக்கு அருகில் வசிக்கிறாள்.', ['by', 'close to', 'next to']], ['The hotel is {near} the airport.', 'ஹோட்டல் விமான நிலையத்துக்கு அருகில் உள்ளது.', ['close to', 'by', 'next to']], ['Sit {near} the window.', 'ஜன்னல் அருகில் உட்காருங்கள்.', ['by', 'close to', 'next to', 'beside']]]],
  ['inside', 'உள்ளே', 'Use "inside" for in the inner part of a place or a thing.', 'ஓர் இடம்/பொருளின் உட்பகுதியில் என்பதற்கு "inside" பயன்படுத்துவோம்.',
    [['The children are inside the house.', 'குழந்தைகள் வீட்டுக்குள் இருக்கிறார்கள்.', 'They are in the inner part of the house.'],
     ['What is inside the box?', 'பெட்டிக்குள் என்ன இருக்கிறது?', 'We ask about the inner part.'],
     ['Please wait inside the office.', 'தயவுசெய்து அலுவலகத்துக்குள் காத்திருங்கள்.', 'The waiting place is the inner part.']],
    [['It is raining, so stay {inside} the car.', 'மழை பெய்கிறது, எனவே காருக்குள்ளேயே இருங்கள்.', ['in']], ['There is a gift {inside} this bag.', 'இந்தப் பைக்குள் ஒரு பரிசு உள்ளது.', ['in']], ['Don\'t keep the shoes {inside} the room.', 'அறைக்குள் காலணிகளை வைக்காதீர்கள்.', ['in']]]],
  ['outside', 'வெளியே', 'Use "outside" for not in the inner part of a place.', 'ஓர் இடத்துக்கு வெளிப்பகுதியில் என்பதற்கு "outside" பயன்படுத்துவோம்.',
    [['The dog is outside the house.', 'நாய் வீட்டுக்கு வெளியே இருக்கிறது.', 'It is not in the house.'],
     ['Let\'s wait outside the hall.', 'மண்டபத்துக்கு வெளியே காத்திருப்போம்.', 'The waiting place is not in the hall.'],
     ['The shop is outside the city.', 'கடை நகருக்கு வெளியே உள்ளது.', 'It is beyond the city limits.']],
    [['The children are playing {outside} the school.', 'குழந்தைகள் பள்ளிக்கு வெளியே விளையாடுகிறார்கள்.'], ['Please leave your shoes {outside} the door.', 'தயவுசெய்து உங்கள் காலணிகளைக் கதவுக்கு வெளியே விடுங்கள்.'], ['He lives {outside} Chennai.', 'அவர் சென்னைக்கு வெளியே வசிக்கிறார்.']]],
  ['around', 'சுற்றி; சுமார்', 'Use "around" for in a circle, on all sides, or for an approximate time or number.', 'வட்டமாக/எல்லாப் பக்கமும் சுற்றி, அல்லது சுமாரான நேரம்/எண்ணிக்கை என்பதற்கு "around" பயன்படுத்துவோம்.',
    [['We sat around the table.', 'நாங்கள் மேசையைச் சுற்றி உட்கார்ந்தோம்.', 'We sat on all sides of the table.'],
     ['She travelled around India.', 'அவள் இந்தியா முழுவதும் பயணம் செய்தாள்.', '"Around" shows many places in an area.'],
     ['I will come around six.', 'நான் சுமார் ஆறு மணிக்கு வருவேன்.', '"Around" means approximately.']],
    [['The earth moves {around} the sun.', 'பூமி சூரியனைச் சுற்றி வருகிறது.'], ['There are trees {around} the house.', 'வீட்டைச் சுற்றி மரங்கள் உள்ளன.'], ['The meeting ends {around} noon.', 'கூட்டம் மதியம் சுமார் பன்னிரண்டு மணிக்கு முடியும்.', ['about']]]],
  ['along', 'வழியே / ஓரமாக', 'Use "along" for moving or being in a line next to something long, like a road or a river.', 'சாலை, ஆறு போன்ற நீண்ட ஒன்றின் வழியே/ஓரமாக என்பதற்கு "along" பயன்படுத்துவோம்.',
    [['We walked along the beach.', 'நாங்கள் கடற்கரையோரம் நடந்தோம்.', 'We moved in a line beside the beach.'],
     ['There are shops along this road.', 'இந்தச் சாலையின் ஓரம் கடைகள் உள்ளன.', 'The shops are in a line on the road.'],
     ['Come along with me.', 'என்னுடன் வாருங்கள்.', '"Along" can mean together with.']],
    [['Trees grow {along} the river.', 'ஆற்றின் ஓரம் மரங்கள் வளர்கின்றன.'], ['He drove {along} the coast.', 'அவன் கடற்கரைச் சாலை வழியே வாகனம் ஓட்டினான்.'], ['Walk {along} this street for two minutes.', 'இந்தத் தெரு வழியே இரண்டு நிமிடம் நடங்கள்.', ['down']]]],
  ['despite', 'இருந்தாலும் / போதிலும்', 'Use "despite" to show something happened even though there was a problem. After "despite" use a noun or verb-ing.', 'ஒரு தடை இருந்தபோதிலும் ஒன்று நடந்தது என்பதைச் சொல்ல "despite" பயன்படுத்துவோம். இதன் பின் பெயர்ச்சொல் அல்லது verb-ing வரும்.',
    [['We went out despite the rain.', 'மழை இருந்தபோதிலும் நாங்கள் வெளியே சென்றோம்.', 'The rain was a problem, but we went anyway.'],
     ['Despite being tired, he finished the work.', 'களைப்பாக இருந்தாலும் அவன் வேலையை முடித்தான்.', '"Despite" + verb-ing is correct.'],
     ['She passed despite her illness.', 'உடல்நலக்குறைவு இருந்தபோதிலும் அவள் தேர்ச்சி பெற்றாள்.', 'The illness was a problem, but she passed.']],
    [['{Despite} the traffic, we arrived on time.', 'போக்குவரத்து நெரிசல் இருந்தபோதிலும் நாங்கள் சரியான நேரத்தில் வந்தோம்.', ['In spite of']], ['He smiled {despite} his pain.', 'வலி இருந்தபோதிலும் அவன் சிரித்தான்.', ['in spite of']], ['She won the race {despite} her injury.', 'காயம் இருந்தபோதிலும் அவள் பந்தயத்தில் வென்றாள்.', ['in spite of']]]],
  ['except', 'தவிர', 'Use "except" to leave out one person or thing from a group.', 'ஒரு குழுவில் ஒருவரை/ஒன்றை விலக்கிச் சொல்ல "except" பயன்படுத்துவோம்.',
    [['Everyone came except Ravi.', 'ரவியைத் தவிர எல்லோரும் வந்தார்கள்.', 'Ravi is left out of the group.'],
     ['The shop is open every day except Sunday.', 'கடை ஞாயிற்றுக்கிழமை தவிர தினமும் திறந்திருக்கும்.', 'Sunday is left out.'],
     ['I like all fruits except mango.', 'மாம்பழம் தவிர எல்லாப் பழங்களும் எனக்குப் பிடிக்கும்.', 'Mango is left out.']],
    [['All the students passed {except} one.', 'ஒருவரைத் தவிர எல்லா மாணவர்களும் தேர்ச்சி பெற்றனர்.', ['but']], ['I eat everything {except} fish.', 'மீன் தவிர எல்லாம் சாப்பிடுவேன்.', ['but']], ['We work every day {except} Sunday.', 'ஞாயிறு தவிர தினமும் வேலை செய்வோம்.', ['but']]]],
  ['instead of', 'க்குப் பதிலாக', 'Use "instead of" when one thing is used or chosen in place of another.', 'ஒன்றுக்குப் பதிலாக மற்றொன்றைப் பயன்படுத்தும்போது "instead of" பயன்படுத்துவோம்.',
    [['I drink tea instead of coffee.', 'நான் காபிக்குப் பதிலாகத் தேநீர் குடிக்கிறேன்.', 'Tea replaces coffee.'],
     ['Let\'s walk instead of taking a bus.', 'பேருந்தில் செல்வதற்குப் பதிலாக நடந்து செல்வோம்.', '"Instead of" + verb-ing replaces an action.'],
     ['She sent me an email instead of calling.', 'அவள் அழைப்பதற்குப் பதிலாக எனக்கு மின்னஞ்சல் அனுப்பினாள்.', 'Email replaces the call.']],
    [['Use honey {instead of} sugar.', 'சர்க்கரைக்குப் பதிலாகத் தேனைப் பயன்படுத்துங்கள்.'], ['He stayed home {instead of} going to work.', 'அவன் வேலைக்குப் போவதற்குப் பதிலாக வீட்டிலேயே இருந்தான்.'], ['Can I have rice {instead of} bread?', 'ரொட்டிக்குப் பதிலாக எனக்கு சாதம் கிடைக்குமா?']]],
  ['because of', 'காரணமாக', 'Use "because of" before a noun or a noun phrase to give a reason.', 'ஒரு காரணத்தைச் சொல்ல, பெயர்ச்சொல்லுக்கு முன் "because of" பயன்படுத்துவோம்.',
    [['The match stopped because of the rain.', 'மழை காரணமாகப் போட்டி நிறுத்தப்பட்டது.', 'The rain is the reason (a noun).'],
     ['I was late because of the traffic.', 'போக்குவரத்து நெரிசல் காரணமாக நான் தாமதமானேன்.', 'The traffic is the reason.'],
     ['She is famous because of her songs.', 'தன் பாடல்களால் அவள் பிரபலமானவள்.', 'Her songs are the reason.']],
    [['We cancelled the trip {because of} the storm.', 'புயல் காரணமாக நாங்கள் பயணத்தை ரத்து செய்தோம்.', ['due to', 'owing to']], ['He could not sleep {because of} the noise.', 'சத்தம் காரணமாக அவனால் தூங்க முடியவில்லை.', ['due to', 'owing to']], ['The flight was late {because of} fog.', 'பனிமூட்டம் காரணமாக விமானம் தாமதமானது.', ['due to', 'owing to']]]],
  ['in front of', 'முன்னால்', 'Use "in front of" for at the front of someone or something.', 'ஒருவர்/ஒன்றின் முன்புறம் என்பதற்கு "in front of" பயன்படுத்துவோம்.',
    [['The car is in front of the house.', 'கார் வீட்டுக்கு முன்னால் நிற்கிறது.', 'The car is at the front side of the house.'],
     ['Don\'t stand in front of the TV.', 'தொலைக்காட்சிக்கு முன்னால் நிற்காதீர்கள்.', 'You would block the view.'],
     ['She sat in front of me.', 'அவள் எனக்கு முன்னால் உட்கார்ந்தாள்.', 'She was nearer the front than me.']],
    [['There is a tree {in front of} our school.', 'எங்கள் பள்ளிக்கு முன்னால் ஒரு மரம் உள்ளது.'], ['Please don\'t speak {in front of} the baby.', 'தயவுசெய்து குழந்தை முன்னால் பேசாதீர்கள்.'], ['He parked {in front of} the shop.', 'அவன் கடைக்கு முன்னால் வண்டியை நிறுத்தினான்.', ['outside']]]],
  ['next to', 'பக்கத்தில் / அடுத்து', 'Use "next to" for at the side of something with nothing between them.', 'இடையில் எதுவும் இல்லாமல் ஒன்றின் பக்கத்தில் என்பதற்கு "next to" பயன்படுத்துவோம்.',
    [['The bank is next to the post office.', 'வங்கி தபால் நிலையத்தின் பக்கத்தில் உள்ளது.', 'Nothing is between the bank and the post office.'],
     ['Sit next to me.', 'என் பக்கத்தில் உட்காருங்கள்.', 'Sit at my side.'],
     ['My room is next to the kitchen.', 'என் அறை சமையலறையின் பக்கத்தில் உள்ளது.', 'The two rooms share a wall.']],
    [['The pharmacy is {next to} the hospital.', 'மருந்தகம் மருத்துவமனையின் பக்கத்தில் உள்ளது.', ['beside', 'near', 'by']], ['Put the chair {next to} the window.', 'நாற்காலியை ஜன்னல் பக்கத்தில் வையுங்கள்.', ['beside', 'by', 'near']], ['Who is sitting {next to} you?', 'உங்கள் பக்கத்தில் யார் உட்கார்ந்திருக்கிறார்கள்?', ['beside', 'by']]]],
  ['according to', 'படி / கூற்றுப்படி', 'Use "according to" to say where information comes from. Do not use it for your own opinion.', 'தகவல் எங்கிருந்து வந்தது என்பதைச் சொல்ல "according to" பயன்படுத்துவோம். சொந்தக் கருத்துக்குப் பயன்படுத்தக்கூடாது.',
    [['According to the news, it will rain tomorrow.', 'செய்தியின்படி நாளை மழை பெய்யும்.', 'The news is the source of the information.'],
     ['According to my teacher, this answer is correct.', 'என் ஆசிரியரின் கூற்றுப்படி இந்த பதில் சரி.', 'The teacher is the source.'],
     ['The film starts at six, according to the poster.', 'சுவரொட்டியின்படி படம் ஆறு மணிக்குத் தொடங்கும்.', 'The poster is the source.']],
    [['{According to} the timetable, the bus leaves at nine.', 'நேரப்பட்டியலின்படி பேருந்து ஒன்பது மணிக்குப் புறப்படும்.'], ['{According to} the doctor, you should rest.', 'மருத்துவரின் கூற்றுப்படி நீங்கள் ஓய்வெடுக்க வேண்டும்.'], ['The shop is closed today, {according to} Raj.', 'ராஜ் சொன்னபடி கடை இன்று மூடப்பட்டுள்ளது.']]],
  ['of', 'இன் (சார்புடைய)', 'Use "of" to show belonging, a part of something, or what something is made from or contains.', 'சொந்தம், ஒன்றின் பகுதி, அல்லது உள்ளடக்கத்தைச் சொல்ல "of" பயன்படுத்துவோம்.',
    [['This is a picture of my family.', 'இது என் குடும்பத்தின் படம்.', '"Of" connects the picture and its subject.'],
     ['I need a cup of tea.', 'எனக்கு ஒரு கோப்பை தேநீர் வேண்டும்.', '"A cup of" shows the amount.'],
     ['He is afraid of dogs.', 'அவன் நாய்களுக்குப் பயப்படுகிறான்.', '"Afraid of" is a fixed phrase.']],
    [['The capital {of} Tamil Nadu is Chennai.', 'தமிழ்நாட்டின் தலைநகரம் சென்னை.'], ['I drank a glass {of} water.', 'நான் ஒரு டம்ளர் தண்ணீர் குடித்தேன்.'], ['She is proud {of} her son.', 'அவள் தன் மகனைப் பற்றிப் பெருமைப்படுகிறாள்.']]],
  ['until', 'வரை', 'Use "until" for something that continues up to a time, then stops.', 'ஒரு நேரம் வரை தொடர்ந்து நடப்பதைச் சொல்ல "until" பயன்படுத்துவோம்.',
    [['I will wait until five o\'clock.', 'நான் ஐந்து மணி வரை காத்திருப்பேன்.', 'The waiting continues up to five.'],
     ['She worked until midnight.', 'அவள் நள்ளிரவு வரை வேலை செய்தாள்.', 'The work continued up to midnight.'],
     ['Stay here until I come back.', 'நான் திரும்பி வரும் வரை இங்கேயே இருங்கள்.', '"Until" can join two parts of a sentence.']],
    [['The shop is open {until} ten.', 'கடை பத்து மணி வரை திறந்திருக்கும்.', ['till']], ['We played {until} it got dark.', 'இருட்டும் வரை நாங்கள் விளையாடினோம்.', ['till']], ['Please wait {until} Monday.', 'தயவுசெய்து திங்கட்கிழமை வரை காத்திருங்கள்.', ['till']]]],
  ['off', 'விலகி; அணைந்து', 'Use "off" for away from a place or surface, or when a machine is not working.', 'ஓர் இடம்/பரப்பிலிருந்து விலகி, அல்லது இயந்திரம் இயங்காமல் இருப்பதற்கு "off" பயன்படுத்துவோம்.',
    [['The book fell off the table.', 'புத்தகம் மேசையிலிருந்து கீழே விழுந்தது.', 'The book moved away from the surface.'],
     ['Please turn off the light.', 'தயவுசெய்து விளக்கை அணையுங்கள்.', '"Turn off" stops the light.'],
     ['Take your feet off the seat.', 'இருக்கையிலிருந்து உங்கள் கால்களை எடுங்கள்.', '"Off" means away from the seat.']],
    [['He got {off} the bus at the market.', 'அவன் சந்தையில் பேருந்திலிருந்து இறங்கினான்.'], ['Keep {off} the grass.', 'புல்தரையில் நடக்காதீர்கள்.'], ['The cat jumped {off} the wall.', 'பூனை சுவரிலிருந்து குதித்தது.']]],
  ['out of', 'இலிருந்து வெளியே', 'Use "out of" for moving from inside to outside, or when you have no more of something.', 'உள்ளிருந்து வெளியே வருவதற்கு, அல்லது ஒன்று தீர்ந்துவிட்டதைச் சொல்ல "out of" பயன்படுத்துவோம்.',
    [['She took a pen out of her bag.', 'அவள் பையிலிருந்து ஒரு பேனாவை எடுத்தாள்.', 'The pen moved from inside to outside.'],
     ['We are out of milk.', 'எங்களிடம் பால் தீர்ந்துவிட்டது.', 'There is no milk left.'],
     ['He ran out of the room.', 'அவன் அறையிலிருந்து வெளியே ஓடினான்.', 'He moved from inside to outside.']],
    [['The dog jumped {out of} the car.', 'நாய் காரிலிருந்து வெளியே குதித்தது.'], ['I am {out of} money.', 'என்னிடம் பணம் தீர்ந்துவிட்டது.'], ['Get {out of} my way.', 'என் வழியிலிருந்து விலகுங்கள்.']]],
  ['like', 'போல', 'Use "like" to say two things are similar. ("Like" here is a preposition.)', 'இரண்டு பொருட்கள் ஒன்றுபோல் இருப்பதைச் சொல்ல "like" பயன்படுத்துவோம்.',
    [['She sings like a bird.', 'அவள் பறவையைப் போலப் பாடுகிறாள்.', 'Her singing is similar to a bird.'],
     ['It looks like rain.', 'மழை வருவது போலத் தெரிகிறது.', '"Looks like" shows what it seems.'],
     ['He is tall like his father.', 'அவன் தன் தந்தையைப் போல உயரமாக இருக்கிறான்.', 'He and his father are similar in height.']],
    [['My brother is {like} a friend to me.', 'என் அண்ணன் எனக்கு நண்பனைப் போல.'], ['This tastes {like} chicken.', 'இது கோழிக்கறி போல ருசிக்கிறது.'], ['She works {like} a machine.', 'அவள் இயந்திரத்தைப் போல வேலை செய்கிறாள்.', ['as']]]],
];

// Sorted alphabetically for the dropdown.
export const PREPOSITION_LESSONS: PrepLesson[] = SRC.map(([word, tamil, usage, usageTa, examples, questions]) => ({
  word, tamil, usage, usageTa,
  examples: examples.map(([en, ta, why]) => ({ en, ta, why })),
  questions: questions.map((q) => {
    const sentence = q[0];
    const ta = q[1];
    const alts = q.length === 3 ? q[2] : [];
    const main = /\{([^}]+)\}/.exec(sentence)?.[1] ?? word;
    const lead = /^\{/.test(sentence);
    const cap = (s: string) => (lead ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    return {
      blank: sentence.replace(/\{[^}]+\}/, '____'),
      full: sentence.replace(/\{([^}]+)\}/, '$1'),
      ta,
      answers: [main, ...alts.map(cap)],
    };
  }),
})).sort((a, b) => a.word.localeCompare(b.word));

/** Normalise a typed or stored answer: lower-case, no punctuation, single spaces. */
export function normPrep(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Is the typed answer one of the accepted answers? "in spite of" for "despite", "beside" for "next to" and so on are accepted. */
export function isPrepAnswerAccepted(typed: string, q: PrepQuestion): boolean {
  const given = normPrep(typed).replace(/^(the )?(answer is |it is |it's |its )/, '');
  if (!given) return false;
  return q.answers.some((a) => normPrep(a) === given);
}

export interface ExtraPrepItem { word: string; tamil?: string; example?: string; exampleTamil?: string }

/**
 * Merges words from an optional extra data file (`prepositions-500.json`) into the built-in lessons.
 * A built-in lesson is never replaced or removed. A word that is only in the file becomes a lesson built from that file's
 * sentences (up to three examples, and fill-in-the-blank questions made from the same sentences).
 */
export function mergeExtraPrepositions(base: PrepLesson[], extra: ExtraPrepItem[] | null | undefined): PrepLesson[] {
  const byWord = new Map<string, PrepLesson>(base.map((l) => [normPrep(l.word), l]));
  const grouped = new Map<string, ExtraPrepItem[]>();
  for (const item of Array.isArray(extra) ? extra : []) {
    if (!item || typeof item.word !== 'string' || !item.word.trim()) continue;
    const key = normPrep(item.word);
    if (byWord.has(key)) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const added: PrepLesson[] = [];
  for (const [key, items] of grouped) {
    const word = items[0].word.trim();
    const usable = items.filter((i) => i.example && i.example.trim());
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc}\\b`, 'i');
    added.push({
      word,
      tamil: items.find((i) => i.tamil)?.tamil ?? '',
      usage: `Use "${word}" as shown in the examples below.`,
      usageTa: `கீழே உள்ள எடுத்துக்காட்டுகளில் காட்டியபடி "${word}" ஐப் பயன்படுத்துங்கள்.`,
      examples: usable.slice(0, 3).map((i) => ({ en: i.example as string, ta: i.exampleTamil ?? '', why: `"${word}" is the preposition used here.` })),
      questions: usable.filter((i) => re.test(i.example as string)).map((i) => ({
        blank: (i.example as string).replace(re, '____'), full: i.example as string, ta: i.exampleTamil ?? '', answers: [word],
      })),
    });
    byWord.set(key, added[added.length - 1]);
  }
  return [...base, ...added].sort((a, b) => a.word.localeCompare(b.word));
}
