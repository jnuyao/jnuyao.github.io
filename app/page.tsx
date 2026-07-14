"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "home" | "library" | "practice" | "parent";

type Book = {
  id: string;
  title: string;
  image: string;
  colour: string;
  label: string;
  summary: string;
  summaryZh: string;
  words: string[];
  phrase: string;
  skills: string[];
  targets: string[];
  question: string;
  answer: string;
};

type Progress = {
  completed: string[];
  mastered: string[];
};

const books: Book[] = [
  {
    id: "ants",
    title: "Ants in a Hurry",
    image: "/books/ants-in-a-hurry.jpg",
    colour: "#66b77a",
    label: "Action words",
    summary: "Worker ants hurry through a dark tunnel to feed their queen. When the eggs hatch, there are even more hungry mouths to feed.",
    summaryZh: "工蚁为蚁后送食物，幼蚁孵化后又忙着为它们找食物。",
    words: ["ant", "queen", "tunnel", "scurry", "nibble", "sip", "hush", "eggs"],
    phrase: "Hurry, hurry, hurry!",
    skills: ["Vocabulary", "Grammar", "Comprehension"],
    targets: ["present continuous", "adverbs", "sequence", "repetition"],
    question: "Why do the ants hurry at the end?",
    answer: "The baby ants are hungry, so the ants must bring them food.",
  },
  {
    id: "flying-dan",
    title: "Dan, the Flying Man",
    image: "/books/dan-the-flying-man.jpg",
    colour: "#4e9ed8",
    label: "-an word family",
    summary: "Dan flies over houses, bridges, trains, trees, mountains and seas until the people finally catch him.",
    summaryZh: "Dan 飞过房屋、桥、火车、树林、山和海，最后被大家追上。",
    words: ["Dan", "man", "can", "ran", "catch", "over", "bridge", "mountains"],
    phrase: "Catch me if you can.",
    skills: ["Phonics", "Vocabulary", "Fluency"],
    targets: ["-an rhymes", "over", "places", "repeated refrain"],
    question: "What word tells us Dan is above the bridge?",
    answer: "Over.",
  },
  {
    id: "lost-hat",
    title: "Dan’s Lost Hat",
    image: "/books/dans-lost-hat.jpg",
    colour: "#ef695d",
    label: "Rhymes & place words",
    summary: "Dan cannot find his flying hat. A tabby cat has it, so Dan uses a dish of fish to bring the cat down.",
    summaryZh: "Dan 找不到飞行帽，原来花猫戴走了它；他用鱼把猫引下来。",
    words: ["lost", "under", "on", "in", "shelf", "tabby", "fluffy", "trick"],
    phrase: "He looks everywhere.",
    skills: ["Phonics", "Grammar", "Comprehension"],
    targets: ["-at/-ad rhymes", "prepositions", "problem and solution", "speech marks"],
    question: "Why does Dan put fish in a dish?",
    answer: "He knows the cat will come down for the fish.",
  },
  {
    id: "hari-raya",
    title: "The First Day of Hari Raya",
    image: "/books/first-day-hari-raya.jpg",
    colour: "#e0a93f",
    label: "Family & culture",
    summary: "A family dresses up, shares special food, asks forgiveness, visits the grandparents and receives green packets.",
    summaryZh: "一家人换上新衣、享用节日食物、向父母表达歉意，并拜访祖父母。",
    words: ["visit", "delicious", "lontong", "rendang", "pockets", "kneel", "naughty", "grandchildren"],
    phrase: "Thank you.",
    skills: ["Vocabulary", "Culture", "Speaking"],
    targets: ["family words", "polite language", "food", "event sequence"],
    question: "How do the children show respect?",
    answer: "They ask forgiveness, kiss their elders’ hands and say thank you.",
  },
  {
    id: "mid-autumn",
    title: "Mid-Autumn Festival",
    image: "/books/mid-autumn-festival.jpg",
    colour: "#dd6254",
    label: "Polite questions",
    summary: "At a busy festival, Lee Ling lets go of Dad’s hand. The family searches the stalls and finds her safely eating an egg tart.",
    summaryZh: "热闹的中秋市集里，Lee Ling 与爸爸走散，最后在摊位后被找到。",
    words: ["festival", "lantern", "mooncake", "stall", "seller", "gone", "behind", "found"],
    phrase: "Please, may I have that lantern?",
    skills: ["Grammar", "Culture", "Comprehension"],
    targets: ["polite requests", "past tense", "prepositions", "safety"],
    question: "Why could Dad not hold Lee Ling’s hand?",
    answer: "He had money in one hand and mooncakes in the other.",
  },
  {
    id: "wishy-washy",
    title: "Mrs Wishy-Washy",
    image: "/books/mrs-wishy-washy.jpg",
    colour: "#6b9fc5",
    label: "Animals & past tense",
    summary: "A cow, pig and duck play in the mud. Mrs Wishy-Washy cleans them, but they happily run straight back to the mud.",
    summaryZh: "牛、猪和鸭子玩泥巴，被洗干净后又开心地跑回泥巴里。",
    words: ["cow", "pig", "duck", "mud", "jumped", "rolled", "paddled", "tub"],
    phrase: "Oh, lovely mud!",
    skills: ["Vocabulary", "Grammar", "Fluency"],
    targets: ["past-tense verbs", "he/she/they", "animal actions", "cyclical ending"],
    question: "What makes the ending funny?",
    answer: "The clean animals go back into the mud immediately.",
  },
  {
    id: "giant",
    title: "The Hungry Giant",
    image: "/books/the-hungry-giant.jpg",
    colour: "#7caa65",
    label: "Speech & cause-effect",
    summary: "A giant orders people to bring bread, butter and honey. He strikes a beehive, and the angry bees chase him home.",
    summaryZh: "巨人命令大家送食物；他敲打蜂巢后，被蜜蜂一路追回家。",
    words: ["giant", "hungry", "roared", "bread", "butter", "honey", "beehive", "zoomed"],
    phrase: "I want some honey!",
    skills: ["Vocabulary", "Grammar", "Comprehension"],
    targets: ["some + food", "imperatives", "exclamation marks", "cause and effect"],
    question: "Why do the bees chase the giant?",
    answer: "He hits their beehive.",
  },
  {
    id: "town",
    title: "To Town",
    image: "/books/to-town.jpg",
    colour: "#ef8c45",
    label: "Transport & colours",
    summary: "The storyteller imagines travelling to town by colourful vehicles, from a bulldozer to a helicopter and a jumping stick.",
    summaryZh: "故事用不同颜色的交通工具和拟声词，想象去城里的各种方式。",
    words: ["bulldozer", "fire-engine", "car", "helicopter", "motorbike", "yellow", "blue", "silver"],
    phrase: "I will go to town.",
    skills: ["Vocabulary", "Grammar", "Fluency"],
    targets: ["will", "in/on", "colour adjectives", "sound words"],
    question: "Do we say in a helicopter or on a helicopter?",
    answer: "In a helicopter.",
  },
  {
    id: "jungle",
    title: "Walking Through the Jungle",
    image: "/books/walking-through-jungle.jpg",
    colour: "#3eaa8b",
    label: "Questions & habitats",
    summary: "A traveller explores the jungle, ocean, mountains, river, desert and iceberg while meeting animals around the world.",
    summaryZh: "旅行者穿越不同地貌，遇见狮子、鲸、狼、鳄鱼、蛇和北极熊。",
    words: ["walking", "floating", "climbing", "swimming", "trekking", "slipping", "jungle", "iceberg"],
    phrase: "What do you see?",
    skills: ["Vocabulary", "Grammar", "Fluency"],
    targets: ["-ing actions", "habitats", "question-answer pattern", "animal sounds"],
    question: "Which animal belongs on the iceberg?",
    answer: "The polar bear.",
  },
  {
    id: "baby-sister",
    title: "When My Baby Sister Came Home",
    image: "/books/baby-sister-came-home.jpg",
    colour: "#8d75b7",
    label: "Family & feelings",
    summary: "A new baby cries for every relative. Her brother feels unsure at first, but she becomes quiet when he finally holds her.",
    summaryZh: "小妹妹被亲人抱时一直哭，哥哥抱起她后，她反而安静下来。",
    words: ["sister", "cried", "carried", "fuss", "grandpa", "grandma", "aunty", "lovely"],
    phrase: "My baby sister did not cry.",
    skills: ["Grammar", "Speaking", "Comprehension"],
    targets: ["family words", "past tense", "did/did not", "feelings and inference"],
    question: "How might the brother feel at the end?",
    answer: "He may feel proud and close to his baby sister because she does not cry with him.",
  },
];

const wordQuestions = [
  { id: "w1", prompt: "Which word means ‘move quickly with small steps’?", clue: "The ants ___ through the tunnel.", options: ["scurry", "paddle", "kneel"], answer: "scurry", note: "Scurry is a quick, light movement." },
  { id: "w2", prompt: "Which word is a place where bees live?", clue: "The people find honey inside it.", options: ["tunnel", "beehive", "shelf"], answer: "beehive", note: "A beehive is the home of a bee colony." },
  { id: "w3", prompt: "Which word means ‘very tasty’?", clue: "The special food is ___.", options: ["fluffy", "delicious", "silver"], answer: "delicious", note: "Delicious describes food that tastes very good." },
  { id: "w4", prompt: "Which word names a light you can carry?", clue: "Lee Ling has a rabbit ___.", options: ["lantern", "helicopter", "packet"], answer: "lantern", note: "A lantern is a portable light." },
  { id: "w5", prompt: "Which word means ‘not in sight’?", clue: "Dan’s hat is ___.", options: ["lost", "hungry", "lovely"], answer: "lost", note: "Something lost cannot be found yet." },
  { id: "w6", prompt: "Which word means ‘moved through water with the feet’?", clue: "The duck ___ in the mud.", options: ["rolled", "paddled", "roared"], answer: "paddled", note: "Ducks paddle with their feet." },
];

const rhymeQuestions = [
  { id: "r1", prompt: "Which word rhymes with hat?", clue: "Listen to the ending sound: /at/", options: ["cat", "hit", "hot"], answer: "cat", note: "hat and cat share the /at/ ending." },
  { id: "r2", prompt: "Which word rhymes with Dan?", clue: "Listen to the ending sound: /an/", options: ["man", "down", "dish"], answer: "man", note: "Dan and man share the /an/ ending." },
  { id: "r3", prompt: "Which word rhymes with town?", clue: "Listen to the ending sound: /own/", options: ["train", "down", "trees"], answer: "down", note: "town and down share the /own/ ending." },
  { id: "r4", prompt: "Which word rhymes with fish?", clue: "Listen to the ending sound: /ish/", options: ["dish", "fuss", "found"], answer: "dish", note: "fish and dish share the /ish/ ending." },
  { id: "r5", prompt: "Which word rhymes with quick?", clue: "Listen to the ending sound: /ick/", options: ["trick", "cried", "queen"], answer: "trick", note: "quick and trick share the /ick/ ending." },
  { id: "r6", prompt: "Which word rhymes with see?", clue: "Listen to the long /ee/ sound.", options: ["me", "may", "mud"], answer: "me", note: "see and me end with the long /ee/ sound." },
];

const detectiveQuestions = [
  { id: "d1", prompt: "Why does the tabby cat come down?", clue: "Dan puts something tasty in a dish.", options: ["It wants the fish.", "It is tired of flying.", "It wants a bath."], answer: "It wants the fish.", note: "Dan solves the problem by thinking about what the cat wants." },
  { id: "d2", prompt: "What happens because the giant hits the beehive?", clue: "Think cause → effect.", options: ["The bees chase him.", "The people clap.", "The honey disappears."], answer: "The bees chase him.", note: "Hitting the hive causes the bees to defend their home." },
  { id: "d3", prompt: "Where is Lee Ling found?", clue: "Use the place word from the ending.", options: ["Behind a stall.", "Under a bridge.", "Inside a car."], answer: "Behind a stall.", note: "Behind tells us her position." },
  { id: "d4", prompt: "What comes out of the queen ant’s eggs?", clue: "Put the events in order.", options: ["Baby ants.", "More honey.", "A giant."], answer: "Baby ants.", note: "The egg-to-baby sequence is part of an ant’s life cycle." },
  { id: "d5", prompt: "Why is Mrs Wishy-Washy’s ending funny?", clue: "Compare the cleaning with the final action.", options: ["The animals return to the mud.", "The tub flies away.", "The animals go to town."], answer: "The animals return to the mud.", note: "The ending reverses all her hard work." },
  { id: "d6", prompt: "How does the brother probably feel at the end?", clue: "The baby stops crying in his arms.", options: ["Proud and happy.", "Angry with the bees.", "Lost and afraid."], answer: "Proud and happy.", note: "We infer feelings from what happens, even when the text does not name them." },
];

const sentenceQuestions = [
  { id: "s1", hint: "介绍自己：我是会飞的 Dan。", answer: ["I", "am", "Dan,", "the", "flying", "man."], scrambled: ["flying", "I", "the", "man.", "am", "Dan,"] },
  { id: "s2", hint: "询问对方看见什么。", answer: ["What", "do", "you", "see?"], scrambled: ["you", "see?", "What", "do"] },
  { id: "s3", hint: "说蚁后饿了。", answer: ["The", "Queen", "is", "hungry."], scrambled: ["hungry.", "is", "The", "Queen"] },
  { id: "s4", hint: "用 will 说将要去城里。", answer: ["I", "will", "go", "to", "town."], scrambled: ["town.", "go", "will", "I", "to"] },
  { id: "s5", hint: "说 Dan 在床下面寻找。", answer: ["He", "looks", "under", "the", "bed."], scrambled: ["under", "He", "bed.", "looks", "the"] },
  { id: "s6", hint: "礼貌地请求一盏灯笼。", answer: ["Please,", "may", "I", "have", "that", "lantern?"], scrambled: ["that", "I", "lantern?", "Please,", "have", "may"] },
];

const speakingPhrases = [
  { id: "p1", phrase: "Catch me if you can!", source: "Dan, the Flying Man", tip: "Make can rhyme with Dan." },
  { id: "p2", phrase: "What do you see?", source: "Walking Through the Jungle", tip: "Let your voice rise for the question." },
  { id: "p3", phrase: "Please, may I have that lantern?", source: "Mid-Autumn Festival", tip: "Use a calm, polite voice." },
  { id: "p4", phrase: "I want some honey!", source: "The Hungry Giant", tip: "Read the exclamation with a giant voice." },
  { id: "p5", phrase: "Oh, lovely mud!", source: "Mrs Wishy-Washy", tip: "Show how delighted the animal feels." },
  { id: "p6", phrase: "I will go to town.", source: "To Town", tip: "Tap the beat as you read." },
];

const masteryGroups = [
  { icon: "Aa", title: "1. 拼读与流利度", en: "Phonics & fluency", colour: "green", items: ["听辨并说出 -an、-at、-ad、-own、-ick、-ish 等押韵词族", "识读 sh、ch、th、wh 和 -ing 等常见字母组合", "自动识读高频词，并用重复句型提升速度", "根据问号、感叹号、引号和加粗文字改变语气"] },
  { icon: "W", title: "2. 主题词汇", en: "Vocabulary", colour: "blue", items: ["动物、栖息地及动作", "家庭成员、情感与日常生活", "交通工具、颜色、方位与声音", "节日、食物、礼貌及文化习俗"] },
  { icon: "S", title: "3. 句型与语法", en: "Sentences & grammar", colour: "coral", items: ["用 in、on、under、over、behind 描述位置", "理解现在时、进行时、过去时和 will 将来表达", "使用 can/can’t、did/didn’t、I want some…", "提出 What/Where 问题，并用 Please, may I…? 礼貌请求"] },
  { icon: "?", title: "4. 阅读理解", en: "Comprehension", colour: "yellow", items: ["找出人物、地点和主要事件", "按开头—经过—结尾复述故事", "识别问题—解决方法和原因—结果", "借助图画和文字推断人物感受、动机与幽默"] },
  { icon: "↗", title: "5. 口语与写作", en: "Speaking & writing", colour: "violet", items: ["用完整句回答问题，而不只说单词", "有表情地朗读角色对话和拟声词", "用 3–5 句描述或改写一个故事", "正确使用大写字母、句号、问号、感叹号和引号"] },
  { icon: "♥", title: "6. 文化与品格", en: "Culture & character", colour: "rose", items: ["理解 Hari Raya 和 Mid-Autumn Festival 的家庭习俗", "讨论尊重、礼貌、安全、分享和亲情", "比较真实与幻想故事", "联系自己的经历，表达不同但有依据的看法"] },
];

const masteryChecklist = ["我能快速读出常见高频词。", "我能听出并说出一组押韵词。", "我能拼读 sh、ch、th、wh 和 -ing 的词。", "我能用 in / on / under / over / behind 描述位置。", "我能用 What / Where 提问并完整回答。", "我能说出简单的现在、过去和 will 句子。", "我能根据标点有表情地朗读对话。", "我能按开头、经过、结尾复述故事。", "我能解释人物为什么这样做、可能有什么感受。", "我能用尊重的语言谈论家庭和不同节日。"];

const sightWords = ["I", "am", "the", "my", "is", "to", "you", "me", "can", "have", "we", "said", "went", "in", "on", "under", "over", "here", "there", "some", "what", "where", "was", "are", "all", "they", "he", "she", "come", "look", "one", "more"];

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-SG";
  utterance.rate = 0.82;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress>({ completed: [], mastered: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("story-sprout-progress");
      if (saved) setProgress(JSON.parse(saved) as Progress);
    } catch {
      // A fresh local progress record is safe when saved data is unavailable.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("story-sprout-progress", JSON.stringify(progress));
  }, [progress, ready]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedBook(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function navigate(next: Section) {
    setSection(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function award(id: string) {
    setProgress((current) => current.completed.includes(id) ? current : { ...current, completed: [...current.completed, id] });
  }

  function toggleMastery(item: string) {
    setProgress((current) => ({ ...current, mastered: current.mastered.includes(item) ? current.mastered.filter((entry) => entry !== item) : [...current.mastered, item] }));
  }

  const stars = progress.completed.length;

  return (
    <div className="appShell">
      <header className="siteHeader">
        <button className="brandButton" onClick={() => navigate("home")} aria-label="Story Sprout home"><span className="brandLeaf" aria-hidden="true"><i /></span><span><strong>Story Sprout</strong><small>P1 English Adventure</small></span></button>
        <nav className="mainNav" aria-label="Main navigation">
          {([["home", "Home", "首页"], ["library", "Story Shelf", "绘本"], ["practice", "Play & Learn", "练习"], ["parent", "Parent Guide", "家长"]] as [Section, string, string][]).map(([id, label, zh]) => <button key={id} className={section === id ? "active" : ""} aria-pressed={section === id} onClick={() => navigate(id)}>{label}<small>{zh}</small></button>)}
        </nav>
        <div className="starCounter" aria-label={`${stars} learning stars earned`}><span aria-hidden="true">★</span><strong>{stars}</strong><small>stars</small></div>
      </header>

      <main>
        {section === "home" && <HomeView stars={stars} navigate={navigate} openBook={setSelectedBook} />}
        {section === "library" && <LibraryView openBook={setSelectedBook} />}
        {section === "practice" && <PracticeView award={award} completed={progress.completed} />}
        {section === "parent" && <ParentView progress={progress} toggleMastery={toggleMastery} />}
      </main>

      <footer className="siteFooter"><div className="footerBrand"><span className="miniLeaf" aria-hidden="true" /> <strong>Story Sprout</strong></div><p>Little stories. Strong English. 一天十分钟，慢慢长出英语力。</p><p className="privacyNote">Progress stays on this device · 学习进度仅保存在本设备</p></footer>
      {selectedBook && <BookModal book={selectedBook} onClose={() => setSelectedBook(null)} onExplore={() => award(`book-${selectedBook.id}`)} explored={progress.completed.includes(`book-${selectedBook.id}`)} />}
    </div>
  );
}

function HomeView({ stars, navigate, openBook }: { stars: number; navigate: (section: Section) => void; openBook: (book: Book) => void }) {
  const percentage = Math.min(100, (stars / 10) * 100);
  return (
    <>
      <section className="heroSection sectionWrap">
        <div className="heroCopy"><span className="eyebrow"><i aria-hidden="true" /> Hello, story explorer!</span><h1>Ready for today’s<br /><em>story quest?</em></h1><p>Listen, play, and tell the story in your own words. One cheerful 10-minute mission is enough for today.</p><div className="heroActions"><button className="primaryButton" onClick={() => navigate("practice")}>Start today’s quest <span aria-hidden="true">→</span></button><button className="textButton" onClick={() => speak("hat, cat, mat. These words rhyme.")}><span aria-hidden="true">◉</span> Hear today’s sounds</button></div><div className="trustLine"><span>10 stories</span><i /><span>5 practice games</span><i /><span>Made from his P1 books</span></div></div>
        <article className="dailyQuest" aria-label="Today’s learning mission"><div className="questTop"><span>TODAY · 10 MIN</span><strong>★ {stars % 5} / 5</strong></div><div className="questBadge" aria-hidden="true">R</div><h2>Rhyme Rescue</h2><p>Can you hear the matching ending?</p><div className="rhymeRow"><button onClick={() => speak("hat")}>hat</button><span>+</span><button onClick={() => speak("cat")}>cat</button><span>+</span><button onClick={() => speak("mat")}>mat</button></div><div className="questProgress"><span><i style={{ width: `${percentage}%` }} /></span><small>{stars >= 10 ? "Daily trail complete!" : `${Math.max(0, 10 - stars)} stars to fill the trail`}</small></div><button className="questButton" onClick={() => navigate("practice")}>Play Rhyme Rescue <span aria-hidden="true">→</span></button><i className="questSpark one" aria-hidden="true">✦</i><i className="questSpark two" aria-hidden="true">✦</i></article>
      </section>

      <section className="missionBand"><div className="sectionWrap"><div className="sectionHeading"><div><span className="sectionKicker">PICK A MINI MISSION</span><h2>Small steps, big story power.</h2></div><button className="outlineButton" onClick={() => navigate("practice")}>See all 5 games →</button></div><div className="missionGrid"><button className="missionCard green" onClick={() => navigate("practice")}><span className="missionIcon">W</span><span><small>WORDS · 3 MIN</small><strong>Word Safari</strong><em>Spot useful words from every story.</em></span><b aria-hidden="true">→</b></button><button className="missionCard coral" onClick={() => navigate("practice")}><span className="missionIcon">S</span><span><small>SENTENCES · 4 MIN</small><strong>Sentence Builder</strong><em>Put each word in the right place.</em></span><b aria-hidden="true">→</b></button><button className="missionCard yellow" onClick={() => navigate("practice")}><span className="missionIcon">?</span><span><small>THINKING · 3 MIN</small><strong>Story Detective</strong><em>Find clues, feelings and reasons.</em></span><b aria-hidden="true">→</b></button></div></div></section>

      <section className="storyShelf sectionWrap"><div className="sectionHeading"><div><span className="sectionKicker">YOUR STORY SHELF</span><h2>Ten books, one year of English.</h2></div><button className="outlineButton" onClick={() => navigate("library")}>Open the full shelf →</button></div><div className="homeBookGrid">{books.slice(0, 4).map((book, index) => <BookCard key={book.id} book={book} number={index + 1} onClick={() => openBook(book)} />)}</div></section>

      <section className="masteryPreview sectionWrap"><div className="masteryCopy"><span className="sectionKicker">WHAT HE IS BUILDING</span><h2>The six English powers hidden inside the stories.</h2><p>These books repeatedly train sound–word connections, vocabulary, sentence patterns, reading comprehension, speaking and cultural understanding.</p><button className="primaryButton dark" onClick={() => navigate("parent")}>See the parent learning map →</button></div><div className="powerGrid">{masteryGroups.map((group) => <article className={`powerCard ${group.colour}`} key={group.en}><span>{group.icon}</span><div><strong>{group.en}</strong><small>{group.title.replace(/^\d\.\s*/, "")}</small></div></article>)}</div></section>
    </>
  );
}

function BookCard({ book, number, onClick }: { book: Book; number: number; onClick: () => void }) {
  return <button className="bookCard" onClick={onClick} style={{ "--book-colour": book.colour } as React.CSSProperties}><span className="bookNumber">{String(number).padStart(2, "0")}</span><span className="bookCover"><img src={book.image} alt="" /></span><span className="bookInfo"><small>{book.label}</small><strong>{book.title}</strong><em>{book.targets.slice(0, 2).join(" · ")}</em></span><span className="bookArrow" aria-hidden="true">↗</span></button>;
}

function LibraryView({ openBook }: { openBook: (book: Book) => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Phonics", "Vocabulary", "Grammar", "Comprehension", "Culture"];
  const visibleBooks = useMemo(() => filter === "All" ? books : books.filter((book) => book.skills.includes(filter)), [filter]);
  return <section className="pageSection sectionWrap"><div className="pageHero libraryHero"><div><span className="sectionKicker">THE COMPLETE STORY SHELF</span><h1>Every book has a learning job.</h1><p>Open a card to see its story arc, key words, sentence pattern and a question worth discussing.</p></div><div className="heroStat"><strong>10</strong><span>books mapped<br />into 6 skill areas</span></div></div><div className="filterRow" aria-label="Filter stories by skill">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="libraryGrid">{visibleBooks.map((book) => <article className="libraryBook" key={book.id} style={{ "--book-colour": book.colour } as React.CSSProperties}><button className="libraryCover" onClick={() => openBook(book)}><img src={book.image} alt={`Cover of ${book.title}`} /><span>Open learning card →</span></button><div className="libraryInfo"><span>{book.label}</span><h2>{book.title}</h2><p>{book.summary}</p><div className="tagRow">{book.targets.slice(0, 3).map((target) => <small key={target}>{target}</small>)}</div><button className="cardLink" onClick={() => openBook(book)}>Words, pattern &amp; questions →</button></div></article>)}</div></section>;
}

function BookModal({ book, onClose, onExplore, explored }: { book: Book; onClose: () => void; onExplore: () => void; explored: boolean }) {
  return <div className="modalBackdrop" role="presentation" onMouseDown={onClose}><section className="bookModal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modalClose" onClick={onClose} aria-label="Close book card">×</button><div className="modalCover" style={{ "--book-colour": book.colour } as React.CSSProperties}><img src={book.image} alt={`Cover of ${book.title}`} /><span>{book.label}</span></div><div className="modalContent"><span className="sectionKicker">STORY LEARNING CARD</span><h2 id="book-modal-title">{book.title}</h2><p className="englishSummary">{book.summary}</p><p className="zhSummary">给家长：{book.summaryZh}</p><div className="modalBlock"><h3>Word pocket <small>点击听发音</small></h3><div className="wordPocket">{book.words.map((word) => <button key={word} onClick={() => speak(word)}>{word}<span aria-hidden="true">◉</span></button>)}</div></div><div className="modalColumns"><div className="modalBlock phraseBlock"><h3>Sentence to own</h3><button onClick={() => speak(book.phrase)}><span aria-hidden="true">▶</span> “{book.phrase}”</button></div><div className="modalBlock"><h3>Learning targets</h3><ul>{book.targets.map((target) => <li key={target}>{target}</li>)}</ul></div></div><details className="clueBox"><summary>Story Detective: {book.question}</summary><p>{book.answer}</p></details><button className={`exploreButton ${explored ? "done" : ""}`} onClick={onExplore}>{explored ? "★ Story explored" : "Mark as explored +1 ★"}</button></div></section></div>;
}

function PracticeView({ award, completed }: { award: (id: string) => void; completed: string[] }) {
  const [mode, setMode] = useState("words");
  const modes = [["words", "W", "Word Safari", "Vocabulary"], ["rhymes", "R", "Rhyme Rescue", "Phonics"], ["sentences", "S", "Sentence Builder", "Grammar"], ["detective", "?", "Story Detective", "Comprehension"], ["speaking", "◉", "Listen & Say", "Fluency"]];
  return <section className="pageSection sectionWrap practicePage"><div className="pageHero practiceHero"><div><span className="sectionKicker">PLAY &amp; LEARN</span><h1>Five games. One confident reader.</h1><p>Choose one game and finish a few rounds. Every first correct answer earns a star.</p></div><div className="heroStat"><strong>{completed.filter((id) => id.startsWith("practice-")).length}</strong><span>practice stars<br />saved on this device</span></div></div><div className="practiceLayout"><aside className="modeMenu" aria-label="Practice games">{modes.map(([id, icon, label, skill]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}><span>{icon}</span><span><strong>{label}</strong><small>{skill}</small></span><b aria-hidden="true">→</b></button>)}</aside><div className="practiceStage">{mode === "words" && <ChoicePractice key="words" title="Word Safari" eyebrow="Find the meaning" intro="Use the story clue to catch the right word." questions={wordQuestions} award={award} prefix="word" />}{mode === "rhymes" && <ChoicePractice key="rhymes" title="Rhyme Rescue" eyebrow="Hear the ending" intro="Say the words aloud. Which ending matches?" questions={rhymeQuestions} award={award} prefix="rhyme" listen />}{mode === "detective" && <ChoicePractice key="detective" title="Story Detective" eyebrow="Use the clues" intro="Think about sequence, cause, place and feelings." questions={detectiveQuestions} award={award} prefix="detective" />}{mode === "sentences" && <SentencePractice award={award} />}{mode === "speaking" && <SpeakingPractice award={award} />}</div></div></section>;
}

type ChoiceQuestion = { id: string; prompt: string; clue: string; options: string[]; answer: string; note: string };

function ChoicePractice({ title, eyebrow, intro, questions, award, prefix, listen = false }: { title: string; eyebrow: string; intro: string; questions: ChoiceQuestion[]; award: (id: string) => void; prefix: string; listen?: boolean }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const question = questions[index];
  const correct = selected === question.answer;
  function choose(option: string) { if (selected) return; setSelected(option); if (option === question.answer) award(`practice-${prefix}-${question.id}`); }
  function next() { setIndex((current) => (current + 1) % questions.length); setSelected(null); }
  return <div className="gameCard"><div className="gameHeader"><div><span className="sectionKicker">{eyebrow}</span><h2>{title}</h2><p>{intro}</p></div><span className="roundPill">Round {index + 1} / {questions.length}</span></div><div className="questionCard"><span className="questionNumber">{String(index + 1).padStart(2, "0")}</span><h3>{question.prompt}</h3><p>{question.clue}</p>{listen && <button className="listenClue" onClick={() => speak([question.answer, ...question.options.filter((item) => item !== question.answer)].join(", "))}><span aria-hidden="true">◉</span> Hear the words</button>}</div><div className="answerGrid">{question.options.map((option) => { const className = selected ? option === question.answer ? "correct" : option === selected ? "wrong" : "muted" : ""; return <button key={option} className={className} disabled={Boolean(selected)} onClick={() => choose(option)}>{option}<span aria-hidden="true">{selected && option === question.answer ? "✓" : selected && option === selected ? "×" : "→"}</span></button>; })}</div><div className={`feedback ${selected ? "show" : ""} ${correct ? "success" : "tryAgain"}`} aria-live="polite">{selected && <><span aria-hidden="true">{correct ? "★" : "↻"}</span><div><strong>{correct ? "You found it!" : `Good try — the answer is ${question.answer}.`}</strong><p>{question.note}</p></div><button onClick={next}>Next round →</button></>}</div></div>;
}

function SentencePractice({ award }: { award: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const [pool, setPool] = useState<string[]>(sentenceQuestions[0].scrambled);
  const [built, setBuilt] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const question = sentenceQuestions[index];
  const correct = built.join(" ") === question.answer.join(" ");
  function addWord(wordIndex: number) { if (checked) return; const word = pool[wordIndex]; setPool(pool.filter((_, i) => i !== wordIndex)); setBuilt([...built, word]); }
  function removeWord(wordIndex: number) { if (checked) return; const word = built[wordIndex]; setBuilt(built.filter((_, i) => i !== wordIndex)); setPool([...pool, word]); }
  function check() { setChecked(true); if (correct) award(`practice-sentence-${question.id}`); }
  function reset() { setPool(question.scrambled); setBuilt([]); setChecked(false); }
  function next() { const nextIndex = (index + 1) % sentenceQuestions.length; setIndex(nextIndex); setPool(sentenceQuestions[nextIndex].scrambled); setBuilt([]); setChecked(false); }
  return <div className="gameCard sentenceGame"><div className="gameHeader"><div><span className="sectionKicker">Build the pattern</span><h2>Sentence Builder</h2><p>Tap the words in the order they should be read.</p></div><span className="roundPill">Round {index + 1} / {sentenceQuestions.length}</span></div><div className="sentenceHint"><span>Hint 提示</span><p>{question.hint}</p><button onClick={() => speak(question.answer.join(" "))}>◉ Hear it</button></div><div className={`sentenceLine ${checked ? correct ? "correct" : "wrong" : ""}`}>{built.length === 0 && <span className="placeholder">Build your sentence here…</span>}{built.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} onClick={() => removeWord(wordIndex)}>{word}</button>)}</div><div className="wordBank">{pool.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} onClick={() => addWord(wordIndex)}>{word}</button>)}</div><div className="sentenceActions"><button className="secondaryButton" onClick={reset}>Reset</button>{!checked ? <button className="primaryButton" disabled={pool.length > 0} onClick={check}>Check my sentence</button> : <button className="primaryButton" onClick={next}>Next sentence →</button>}</div><div className={`feedback ${checked ? "show" : ""} ${correct ? "success" : "tryAgain"}`} aria-live="polite">{checked && <><span aria-hidden="true">{correct ? "★" : "↻"}</span><div><strong>{correct ? "Perfect sentence!" : "Almost — listen, reset, and try the order again."}</strong><p>{question.answer.join(" ")}</p></div></>}</div></div>;
}

function SpeakingPractice({ award }: { award: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const [saidIt, setSaidIt] = useState(false);
  const item = speakingPhrases[index];
  function mark() { award(`practice-speaking-${item.id}`); setSaidIt(true); }
  function next() { setIndex((current) => (current + 1) % speakingPhrases.length); setSaidIt(false); }
  return <div className="gameCard speakingGame"><div className="gameHeader"><div><span className="sectionKicker">Listen · copy · perform</span><h2>Listen &amp; Say</h2><p>Hear the line, copy it, then perform it with feeling.</p></div><span className="roundPill">Line {index + 1} / {speakingPhrases.length}</span></div><div className="speakingBubble"><span className="soundDisc" aria-hidden="true">◉</span><small>FROM · {item.source}</small><blockquote>“{item.phrase}”</blockquote><p>{item.tip}</p><button onClick={() => speak(item.phrase)}>▶ Listen again</button></div><div className="speakingSteps"><span><b>1</b> Listen</span><i /><span><b>2</b> Copy</span><i /><span><b>3</b> Perform</span></div><div className="sentenceActions">{!saidIt ? <button className="primaryButton" onClick={mark}>I said it! +1 ★</button> : <><span className="spokenDone">★ Brilliant voice!</span><button className="primaryButton" onClick={next}>Next line →</button></>}</div></div>;
}

function ParentView({ progress, toggleMastery }: { progress: Progress; toggleMastery: (item: string) => void }) {
  const masteredPercent = Math.round((progress.mastered.length / masteryChecklist.length) * 100);
  return <section className="pageSection sectionWrap parentPage"><div className="pageHero parentHero"><div><span className="sectionKicker">PARENT LEARNING MAP · 家长学习地图</span><h1>What should a P1 reader master?</h1><p>从这 10 本全年绘本中归纳出的核心能力：先听懂和读准，再理解、表达，最后迁移到自己的口语和写作。</p></div><div className="masteryDial"><strong>{masteredPercent}%</strong><span>家长观察清单</span></div></div><div className="sourceNote"><span aria-hidden="true">i</span><p><strong>这是一份“从绘本反推”的学习地图。</strong>它依据你提供的 10 本书中反复出现的语言与阅读任务整理，不等同于 MOE 官方课程大纲；适合用来做家庭复习和观察。</p></div><div className="parentSectionHeading"><span className="sectionKicker">SIX CORE POWERS</span><h2>本年度需要逐步掌握的六类能力</h2></div><div className="masteryGrid">{masteryGroups.map((group) => <article className={`masteryGroup ${group.colour}`} key={group.en}><div className="masteryGroupHead"><span>{group.icon}</span><div><h3>{group.title}</h3><small>{group.en}</small></div></div><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div><section className="sightWordSection"><div><span className="sectionKicker">HIGH-FREQUENCY WORD BANK</span><h2>这些高频词应逐渐做到“一眼读出”</h2><p>不要只背清单：把词放回绘本的重复句中读，会记得更牢。</p></div><div className="sightWordCloud">{sightWords.map((word) => <button key={word} onClick={() => speak(word)}>{word}<small>◉</small></button>)}</div></section><section className="checklistSection"><div className="checkIntro"><span className="sectionKicker">MASTERY CHECKLIST</span><h2>家长可观察的 10 个“小证据”</h2><p>孩子能够在不同绘本和新句子中稳定做到，才算真正掌握。无需一次全打勾。</p><div className="checkProgress"><span><i style={{ width: `${masteredPercent}%` }} /></span><strong>{progress.mastered.length} / {masteryChecklist.length} 已观察到</strong></div></div><div className="checklist">{masteryChecklist.map((item, index) => { const checked = progress.mastered.includes(item); return <label key={item} className={checked ? "checked" : ""}><input type="checkbox" checked={checked} onChange={() => toggleMastery(item)} /><span className="customCheck">{checked ? "✓" : index + 1}</span><span>{item}</span></label>; })}</div></section><section className="weeklyPlan"><div className="parentSectionHeading"><span className="sectionKicker">A SIMPLE HOME ROUTINE</span><h2>每次 10 分钟，四步循环</h2></div><div className="routineGrid"><article><span>01 · 2 MIN</span><strong>Listen 听</strong><p>家长或网站读一句，孩子手指跟读。</p></article><article><span>02 · 3 MIN</span><strong>Notice 找</strong><p>找一个押韵、位置词或句型。</p></article><article><span>03 · 3 MIN</span><strong>Play 玩</strong><p>完成 2–3 道网站小游戏。</p></article><article><span>04 · 2 MIN</span><strong>Tell 说</strong><p>用自己的话说人物、问题和结局。</p></article></div><div className="parentTip"><strong>最重要的判断：</strong><span>如果孩子能在另一幅图、另一本书或自己的生活里使用同一个词和句型，他才是在“会用英语”，而不只是记住了这一本书。</span></div></section></section>;
}
