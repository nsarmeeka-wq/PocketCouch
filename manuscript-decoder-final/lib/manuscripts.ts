export const translationLanguages = [
  { name: 'English', code: 'en', direction: 'ltr' },
  { name: 'Spanish', code: 'es', direction: 'ltr' },
  { name: 'French', code: 'fr', direction: 'ltr' },
  { name: 'German', code: 'de', direction: 'ltr' },
  { name: 'Portuguese', code: 'pt', direction: 'ltr' },
  { name: 'Arabic', code: 'ar', direction: 'rtl' },
  { name: 'Chinese', code: 'zh-Hans', direction: 'ltr' },
  { name: 'Japanese', code: 'ja', direction: 'ltr' },
  { name: 'Korean', code: 'ko', direction: 'ltr' },
  { name: 'Hindi', code: 'hi', direction: 'ltr' },
  { name: 'Tamil', code: 'ta', direction: 'ltr' },
] as const
export type TranslationLanguage = typeof translationLanguages[number]['name']
export function translationLocale(language: TranslationLanguage) {
  return translationLanguages.find(option => option.name === language)!
}
export type Script = 'Devanagari' | 'Tamil' | 'Bengali' | 'Kannada' | 'Telugu' | 'Odia' | 'Perso-Arabic'
export type Manuscript = {
  id: string
  title: string
  script: Script
  language: string
  subject: string
  period: string
  location: string
  image: string
  text: string
  translations: Record<TranslationLanguage, string>
  preferredTranslation?: TranslationLanguage
  confidence: number
  date: string
}
export const manuscripts: Manuscript[] = [
  {
    id: 'ayurveda', title: 'The art of healing', script: 'Devanagari', language: 'Sanskrit', subject: 'Ayurveda', period: '18th century', location: 'Varanasi, India', image: '/images/sanskrit-manuscript.png',
    text: 'सर्वे भवन्तु सुखिनः। सर्वे सन्तु निरामयाः।\nसर्वे भद्राणि पश्यन्तु। मा कश्चिद्दुःखभाग्भवेत्॥',
    translations: {
      Spanish: 'Que todos sean felices. Que todos estén libres de enfermedades. Que todos vean lo auspicioso. Que nadie sufra.',
      French: 'Que tous soient heureux. Que tous soient exempts de maladie. Que tous voient ce qui est de bon augure. Que personne ne souffre.',
      German: 'Mögen alle glücklich sein. Mögen alle frei von Krankheit sein. Mögen alle das Heilvolle sehen. Möge niemand leiden.',
      Portuguese: 'Que todos sejam felizes. Que todos estejam livres de doenças. Que todos vejam o que é auspicioso. Que ninguém sofra.',
      Arabic: 'ليكن الجميع سعداء. وليكن الجميع معافين من المرض. وليرَ الجميع ما فيه الخير. وألّا يعاني أحد.',
      Chinese: '愿所有人幸福。愿所有人远离疾病。愿所有人见到吉祥美好之事。愿无人受苦。',
      Japanese: 'すべての人が幸せでありますように。すべての人が病から解き放たれますように。すべての人が幸いなものを目にしますように。誰も苦しむことがありませんように。',
      Korean: '모든 이가 행복하기를. 모든 이가 질병에서 벗어나기를. 모든 이가 상서로운 것을 보기를. 그 누구도 고통받지 않기를.',
      English: 'May all be happy. May all be free from illness. May all see what is auspicious. May no one suffer.', Hindi: 'सभी सुखी हों। सभी रोगमुक्त हों। सभी शुभ देखें। कोई भी दुःख का भागी न बने।', Tamil: 'அனைவரும் மகிழ்ச்சியாக இருக்கட்டும். அனைவரும் நோயின்றி இருக்கட்டும். அனைவரும் நன்மையைக் காணட்டும். யாரும் துன்பப்படாதிருக்கட்டும்.' },
    confidence: 94, date: '2026-09-09',
  },
  {
    id: 'tamil', title: 'Wisdom on a palm leaf', script: 'Tamil', language: 'Tamil', subject: 'Philosophy', period: '17th century', location: 'Thanjavur, India', image: '/images/tamil-manuscript.png',
    text: 'அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.',
    translations: {
      Spanish: 'Así como la letra A es la primera de todas las letras, el Eterno es el primero en el mundo.',
      French: 'De même que la lettre A est la première de toutes les lettres, ainsi l’Éternel est le premier dans le monde.',
      German: 'Wie der Buchstabe A der erste aller Buchstaben ist, so steht der Ewige am Anfang der Welt.',
      Portuguese: 'Assim como a letra A é a primeira de todas as letras, o Eterno é o primeiro no mundo.',
      Arabic: 'كما أن حرف الألف هو أول الحروف، فإن الإله الأزلي هو الأول في العالم.',
      Chinese: '正如字母 A 是所有字母之首，永恒的神也是世界之始。',
      Japanese: '文字 A がすべての文字の始まりであるように、永遠なる神は世界の始まりである。',
      Korean: '글자 A가 모든 글자의 시작이듯, 영원한 신은 세상의 시작이다.',
      English: 'As the letter A is the first of all letters, so the Eternal is first in the world.', Hindi: 'जैसे अक्षरों में अ प्रथम है, वैसे ही संसार में आदि भगवान प्रथम हैं।', Tamil: 'எழுத்துகள் அனைத்துக்கும் அகரம் முதலானது. அதுபோல உலகத்துக்கு ஆதிபகவன் முதல்வன்.' },
    confidence: 92, date: '2026-09-08',
  },
  {
    id: 'bengali', title: 'Verses across centuries', script: 'Bengali', language: 'Bengali', subject: 'Literature', period: '19th century', location: 'Kolkata, India', image: '/images/bengali-manuscript.png',
    text: 'চিত্ত যেথা ভয়শূন্য, উচ্চ যেথা শির,\nজ্ঞান যেথা মুক্ত, যেথা গৃহের প্রাচীর',
    translations: {
      Spanish: 'Donde la mente está libre de miedo y la cabeza se mantiene erguida; donde el conocimiento es libre; donde los muros del hogar…',
      French: 'Là où l’esprit est sans peur et la tête haute ; là où le savoir est libre ; là où les murs du foyer…',
      German: 'Wo der Geist ohne Furcht ist und der Kopf hoch erhoben; wo das Wissen frei ist; wo die Mauern des Hauses…',
      Portuguese: 'Onde a mente não tem medo e a cabeça se mantém erguida; onde o conhecimento é livre; onde as paredes do lar…',
      Arabic: 'حيث يكون العقل بلا خوف والرأس مرفوعًا؛ حيث تكون المعرفة حرة؛ حيث جدران البيت…',
      Chinese: '在那里，心灵无所畏惧，头颅高高昂起；在那里，知识自由；在那里，家园的围墙……',
      Japanese: '心に恐れがなく、頭が高く上げられるところ。知識が自由であるところ。家の壁が……',
      Korean: '마음에 두려움이 없고 고개를 높이 드는 곳, 지식이 자유로운 곳, 집의 벽이…',
      English: 'Where the mind is without fear and the head is held high; where knowledge is free; where the walls of the home…', Hindi: 'जहाँ मन भय से मुक्त है और सिर ऊँचा है; जहाँ ज्ञान मुक्त है; जहाँ घर की दीवारें…', Tamil: 'மனம் அச்சமின்றியும் தலை நிமிர்ந்தும் இருக்கும் இடம்; அறிவு சுதந்திரமாக இருக்கும் இடம்; வீட்டின் சுவர்கள்…' },
    confidence: 96, date: '2026-09-07',
  },
  {
    id: 'kannada', title: 'Words that shape a life', script: 'Kannada', language: 'Kannada', subject: 'Philosophy', period: '12th century', location: 'Kalyana, Karnataka, India', image: '/images/kannada-manuscript.png',
    text: 'ಕಳಬೇಡ, ಕೊಲಬೇಡ, ಹುಸಿಯ ನುಡಿಯಲುಬೇಡ,\nಮುನಿಯಬೇಡ, ಅನ್ಯರಿಗೆ ಅಸಹ್ಯಪಡಬೇಡ.',
    translations: {
      Spanish: 'No robes, no mates, no digas mentiras; no te enojes, no desprecies a los demás.',
      French: 'Ne vole pas, ne tue pas, ne dis pas de mensonge ; ne te mets pas en colère, ne méprise pas autrui.',
      German: 'Stiehl nicht, töte nicht, sprich keine Unwahrheit; zürne nicht, verachte andere nicht.',
      Portuguese: 'Não roubes, não mates, não digas mentiras; não te ires, não desprezes os outros.',
      Arabic: 'لا تسرق، لا تقتل، لا تنطق بالكذب؛ لا تغضب، ولا تحتقر الآخرين.',
      Chinese: '不可偷盗，不可杀生，不可妄语；不可发怒，不可厌弃他人。',
      Japanese: '盗むなかれ、殺すなかれ、偽りを語るなかれ。怒るなかれ、他者を厭うなかれ。',
      Korean: '훔치지 말라, 죽이지 말라, 거짓을 말하지 말라. 성내지 말라, 남을 미워하지 말라.',
      English: 'Do not steal, do not kill, do not speak untruth; do not grow angry, do not loathe others.', Hindi: 'चोरी मत करो, हत्या मत करो, झूठ मत बोलो; क्रोध मत करो, दूसरों से घृणा मत करो।', Tamil: 'திருடாதே, கொல்லாதே, பொய் பேசாதே; சினம் கொள்ளாதே, பிறரை வெறுக்காதே.' },
    confidence: 91, date: '2026-09-06',
  },
  {
    id: 'telugu', title: 'A grain of truth', script: 'Telugu', language: 'Telugu', subject: 'Philosophy', period: '17th century', location: 'Kondaveedu, Andhra, India', image: '/images/telugu-manuscript.png',
    text: 'ఉప్పు కప్పురంబు నొక్క పోలిక నుండు,\nచూడ చూడ రుచుల జాడ వేరు.\nపురుషులందు పుణ్య పురుషులు వేరయా,\nవిశ్వదాభిరామ వినుర వేమ.',
    translations: {
      Spanish: 'La sal y el alcanfor parecen iguales a la vista, pero al probarlos su sabor difiere. Así también entre los hombres, los virtuosos se distinguen. Oye esto, Vemana, amado del mundo.',
      French: 'Le sel et le camphre se ressemblent à l’œil, mais au goût leurs saveurs diffèrent. De même parmi les hommes, les vertueux se distinguent. Écoute cela, Vemana, aimé du monde.',
      German: 'Salz und Kampfer sehen dem Auge gleich, doch gekostet ist ihr Geschmack verschieden. So heben sich auch unter den Menschen die Tugendhaften ab. Höre dies, Vemana, Geliebter der Welt.',
      Portuguese: 'O sal e a cânfora parecem iguais aos olhos, mas ao prová-los seus sabores diferem. Assim também entre os homens, os virtuosos se destacam. Ouve isto, Vemana, amado do mundo.',
      Arabic: 'الملح والكافور يتشابهان في المنظر، لكن عند تذوقهما يختلف طعمهما. وكذلك بين الناس يتميز أهل الفضل. اسمع هذا يا فيمانا، يا حبيب العالم.',
      Chinese: '盐与樟脑看似相同，尝之则味道迥异。人亦如此，有德者自当出众。听着吧，世人所爱的维摩那。',
      Japanese: '塩と樟脳は目には同じように見えるが、味わえばその風味は異なる。人もまた同じく、徳ある者は際立つ。聞け、世に愛されるヴェーマよ。',
      Korean: '소금과 장뇌는 눈에는 같아 보이나 맛보면 그 맛이 다르다. 사람도 그러하여 덕 있는 이는 남다르다. 들으라, 세상이 사랑하는 베마나여.',
      English: 'Salt and camphor look alike to the eye, but taste them and their flavors differ. So too among men, the virtuous stand apart — hear this, Vemana, beloved of the world.', Hindi: 'नमक और कपूर देखने में एक से लगते हैं, पर चखने पर उनका स्वाद भिन्न होता है। वैसे ही मनुष्यों में सद्गुणी अलग दिखते हैं। सुन, हे जगत्प्रिय वेमना।', Tamil: 'உப்பும் கற்பூரமும் பார்வைக்கு ஒன்றுபோல் தோன்றும், ஆனால் சுவைத்தால் அவற்றின் சுவை வேறு. அதுபோல் மனிதரிலும் நல்லோர் தனித்து நிற்பர். இதைக் கேள், உலகம் விரும்பும் வேமனா.' },
    confidence: 90, date: '2026-09-05',
  },
  {
    id: 'prakrit', title: 'A salutation of reverence', script: 'Devanagari', language: 'Prakrit', subject: 'Philosophy', period: '5th century', location: 'Shravanabelagola, India', image: '/images/sanskrit-manuscript.png',
    text: 'णमो अरहंताणं, णमो सिद्धाणं,\nणमो आयरियाणं, णमो उवज्झायाणं,\nणमो लोए सव्वसाहूणं.',
    translations: {
      Spanish: 'Me inclino ante los iluminados, me inclino ante las almas liberadas, me inclino ante los guías espirituales, me inclino ante los maestros, me inclino ante todos los ascetas del mundo.',
      French: 'Je m’incline devant les êtres éveillés, je m’incline devant les âmes libérées, je m’incline devant les guides spirituels, je m’incline devant les maîtres, je m’incline devant tous les ascètes du monde.',
      German: 'Ich verneige mich vor den Erleuchteten, ich verneige mich vor den befreiten Seelen, ich verneige mich vor den geistigen Führern, ich verneige mich vor den Lehrern, ich verneige mich vor allen Asketen der Welt.',
      Portuguese: 'Inclino-me perante os iluminados, inclino-me perante as almas libertas, inclino-me perante os guias espirituais, inclino-me perante os mestres, inclino-me perante todos os ascetas do mundo.',
      Arabic: 'أنحني للمستنيرين، أنحني للأرواح المتحررة، أنحني للمرشدين الروحيين، أنحني للمعلمين، أنحني لكل النساك في العالم.',
      Chinese: '我礼敬觉悟者，我礼敬解脱的灵魂，我礼敬精神导师，我礼敬师长，我礼敬世间一切修行者。',
      Japanese: '覚りし者に礼拝し、解脱せし魂に礼拝し、導師に礼拝し、教師に礼拝し、世のすべての修行者に礼拝する。',
      Korean: '깨달은 이들께 절하고, 해탈한 영혼들께 절하며, 영적 스승들께 절하고, 가르치는 이들께 절하며, 세상 모든 수행자에게 절합니다.',
      English: 'I bow to the enlightened ones, I bow to the liberated souls, I bow to the spiritual leaders, I bow to the teachers, I bow to all ascetics in the world.', Hindi: 'मैं अरिहंतों को नमन करता हूँ, सिद्धों को नमन करता हूँ, आचार्यों को नमन करता हूँ, उपाध्यायों को नमन करता हूँ, लोक के समस्त साधुओं को नमन करता हूँ।', Tamil: 'ஞானம் பெற்றவர்களை வணங்குகிறேன், முக்தி அடைந்த ஆன்மாக்களை வணங்குகிறேன், ஆன்மிக குருமார்களை வணங்குகிறேன், ஆசிரியர்களை வணங்குகிறேன், உலகின் அனைத்து துறவிகளையும் வணங்குகிறேன்.' },
    confidence: 89, date: '2026-09-04',
  },
  {
    id: 'persian', title: 'Members of one body', script: 'Perso-Arabic', language: 'Persian', subject: 'Literature', period: '13th century', location: 'Shiraz, Persia', image: '/images/persian-manuscript.png',
    text: 'بنی‌آدم اعضای یکدیگرند\nکه در آفرینش ز یک گوهرند\nچو عضوی به درد آورد روزگار\nدگر عضوها را نماند قرار',
    translations: {
      Spanish: 'Los seres humanos son miembros de un mismo cuerpo, pues en su creación son de una sola esencia. Cuando un miembro sufre dolor, los demás miembros no pueden hallar reposo.',
      French: 'Les êtres humains sont les membres d’un même corps, car dans leur création ils sont d’une seule essence. Quand un membre est frappé par la douleur, les autres membres ne peuvent rester en repos.',
      German: 'Die Menschen sind Glieder eines Leibes, denn in ihrer Schöpfung sind sie aus einem Wesen. Wird ein Glied vom Schmerz getroffen, so finden die anderen Glieder keine Ruhe.',
      Portuguese: 'Os seres humanos são membros de um mesmo corpo, pois em sua criação são de uma só essência. Quando um membro é atingido pela dor, os outros membros não podem permanecer em repouso.',
      Arabic: 'بنو آدم أعضاء جسد واحد، فهم في الخلق من جوهر واحد. فإذا آلم الدهر عضواً منها، لم يهدأ لسائر الأعضاء قرار.',
      Chinese: '世人本是一体，同源而生。若一肢受苦，其余肢体亦难安宁。',
      Japanese: '人はみな一つの体の肢体であり、その創造において一つの本質から成る。ひとつの肢体が痛みに苦しめば、他の肢体も安らぐことはできない。',
      Korean: '사람은 모두 한 몸의 지체이니, 그 창조에서 한 본질에서 났도다. 한 지체가 고통을 겪으면 다른 지체들도 평안할 수 없다.',
      English: 'Human beings are members of one another, since in their creation they are of one essence. When one member is afflicted with pain, the other members cannot remain at rest.', Hindi: 'मनुष्य एक ही देह के अंग हैं, क्योंकि रचना में वे एक ही तत्व से बने हैं। जब कोई एक अंग पीड़ा पाता है, तो शेष अंग भी चैन से नहीं रह पाते।', Tamil: 'மனிதர் அனைவரும் ஒரே உடலின் உறுப்புகள்; படைப்பில் அவர்கள் ஒரே சாரத்திலிருந்து வந்தவர்கள். ஒரு உறுப்பு வேதனையுறும்போது, மற்ற உறுப்புகளும் அமைதியாக இருக்க முடியாது.' },
    confidence: 93, date: '2026-09-03',
  },
  {
    id: 'odia', title: 'A vow for the world', script: 'Odia', language: 'Odia', subject: 'Literature', period: '19th century', location: 'Khaliapali, Odisha, India', image: '/images/odia-manuscript.png',
    text: 'ମୋ ଜୀବନ ପଛେ ନର୍କେ ପଡିଥାଉ,\nଜଗତ ଉଦ୍ଧାର ହେଉ।',
    translations: {
      Spanish: 'Que mi propia vida caiga al infierno, si es preciso, con tal de que el mundo sea redimido.',
      French: 'Que ma propre vie tombe en enfer, s’il le faut, pourvu que le monde soit sauvé.',
      German: 'Mag mein eigenes Leben zur Hölle fahren, wenn es sein muss, solange nur die Welt erlöst wird.',
      Portuguese: 'Que a minha própria vida caia no inferno, se preciso for, contanto que o mundo seja redimido.',
      Arabic: 'لتهوِ حياتي إلى الجحيم إن لزم الأمر، ما دام العالم يُخلَّص.',
      Chinese: '纵使我的生命堕入地狱，也在所不惜，只愿这世界得以救度。',
      Japanese: 'たとえわが命が地獄に落ちようとも構わない、この世が救われるのであれば。',
      Korean: '내 목숨이 지옥에 떨어진다 해도 좋으니, 이 세상이 구원받기만 한다면.',
      English: 'Let my own life fall into hell if it must, so long as the world is redeemed.', Hindi: 'चाहे मेरा जीवन नरक में ही क्यों न गिरे, बस यह जगत उद्धार पा जाए।', Tamil: 'என் உயிர் நரகில் விழுந்தாலும் பரவாயில்லை, இவ்வுலகம் மீட்கப்பட்டால் போதும்.' },
    confidence: 90, date: '2026-09-02',
  },
  {
    id: 'marathi', title: 'A blessing for all beings', script: 'Devanagari', language: 'Marathi', subject: 'Literature', period: '13th century', location: 'Nevasa, Maharashtra, India', image: '/images/sanskrit-manuscript.png',
    text: 'भूतां परस्परे जडो। मैत्र जीवांचे॥\nजो जे वांछील तो ते लाहो। प्राणिजात॥',
    translations: {
      Spanish: 'Que todos los seres se unan entre sí en amistad; que toda criatura viviente alcance cuanto desee.',
      French: 'Que tous les êtres soient liés les uns aux autres par l’amitié ; que toute créature vivante obtienne tout ce qu’elle désire.',
      German: 'Mögen alle Wesen einander in Freundschaft verbunden sein; möge jedes lebende Geschöpf alles erlangen, was es begehrt.',
      Portuguese: 'Que todos os seres se unam uns aos outros em amizade; que toda criatura viva alcance tudo o que desejar.',
      Arabic: 'لتترابط جميع الكائنات بعضها ببعض في صداقة، ولينل كل مخلوق حي كل ما يتمناه.',
      Chinese: '愿众生彼此以友爱相系；愿一切有情各遂其所愿。',
      Japanese: 'すべての生きとし生けるものが互いに友情で結ばれますように。あらゆる生き物が望むものをことごとく得られますように。',
      Korean: '모든 존재가 서로 우정으로 이어지기를, 살아 있는 모든 것이 원하는 바를 모두 이루기를.',
      English: 'May all beings be bound to one another in friendship; may every living creature attain whatever it desires.', Hindi: 'समस्त प्राणी परस्पर मैत्री से बँध जाएँ; प्रत्येक जीव जो चाहे वही उसे प्राप्त हो।', Tamil: 'உயிர்கள் அனைத்தும் ஒன்றோடொன்று நட்பினால் இணையட்டும்; ஒவ்வொரு உயிரும் தான் விரும்பியதை அடையட்டும்.' },
    confidence: 92, date: '2026-09-01',
  },
  {
    id: 'pali', title: 'The eternal law', script: 'Devanagari', language: 'Pali', subject: 'Philosophy', period: '3rd century BCE', location: 'Magadha, India', image: '/images/sanskrit-manuscript.png',
    text: 'न हि वेरेन वेरानि, सम्मन्तीध कुदाचनं।\nअवेरेन च सम्मन्ति, एस धम्मो सनन्तनो॥',
    translations: {
      Spanish: 'El odio nunca se apacigua con odio en este mundo; solo con el no-odio se apacigua el odio. Esta es una ley eterna.',
      French: 'La haine ne s’apaise jamais par la haine en ce monde ; c’est par la non-haine seule que la haine s’apaise. Telle est la loi éternelle.',
      German: 'Hass wird in dieser Welt niemals durch Hass gestillt; allein durch Nicht-Hass wird Hass gestillt. Dies ist ein ewiges Gesetz.',
      Portuguese: 'O ódio nunca se apazigua com ódio neste mundo; só pela ausência de ódio o ódio se apazigua. Esta é uma lei eterna.',
      Arabic: 'لا يُطفأ الحقد بالحقد أبداً في هذا العالم؛ وإنما بغير الحقد يُطفأ الحقد. هذا قانون أزلي.',
      Chinese: '于此世间，怨恨绝不能以怨恨止息；唯以无怨方能止息怨恨。此乃永恒之法。',
      Japanese: 'この世において、怨みは怨みによって決して鎮まることはない。怨みなきことによってのみ怨みは鎮まる。これは永遠の理である。',
      Korean: '이 세상에서 원한은 결코 원한으로 그치지 않는다. 오직 원한 없음으로써 원한이 그친다. 이것이 영원한 법이다.',
      English: 'Hatred is never appeased by hatred in this world; by non-hatred alone is hatred appeased. This is an eternal law.', Hindi: 'इस संसार में वैर से वैर कभी शांत नहीं होता; अवैर से ही वैर शांत होता है। यही सनातन धर्म है।', Tamil: 'இவ்வுலகில் பகையால் பகை ஒருபோதும் தணியாது; பகையின்மையால் மட்டுமே பகை தணியும். இதுவே நித்திய தர்மம்.' },
    confidence: 91, date: '2026-08-31',
  },
]
export function downloadFile(content: string, name: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
