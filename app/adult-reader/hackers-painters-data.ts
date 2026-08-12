export const HACKERS_PAINTERS_UNIT_IDS = [
  "makers",
  "designers-not-implementors",
  "learn-by-making",
  "gradual-refinement",
  "collaboration-and-empathy",
  "new-medium",
] as const;

export type HackersPaintersUnitId = (typeof HACKERS_PAINTERS_UNIT_IDS)[number];

export type HackersPaintersParagraph = {
  id: string;
  page: number;
  text: string;
};

export type HackersPaintersTargetWord = {
  word: string;
  ipa: string;
  definition: string;
  definitionZh: string;
  collocation: string;
};

export type HackersPaintersSentenceChunk = {
  text: string;
  role: string;
  roleZh: string;
};

export type HackersPaintersSentenceLab = {
  sentence: string;
  chunks: HackersPaintersSentenceChunk[];
  explanationZh: string;
};

export type HackersPaintersComprehensionQuestion = {
  prompt: string;
  promptZh?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type HackersPaintersSpeakingPrompt = {
  prompt: string;
  promptZh: string;
  starters: string[];
};

export type HackersPaintersWritingPrompt = {
  prompt: string;
  promptZh: string;
  starter: string;
};

export type HackersPaintersUnit = {
  id: HackersPaintersUnitId;
  title: string;
  titleZh: string;
  pdfPages: number[];
  pageImages: string[];
  guidingQuestion: string;
  guidingQuestionZh: string;
  paragraphs: HackersPaintersParagraph[];
  targetWords: HackersPaintersTargetWord[];
  sentenceLab: HackersPaintersSentenceLab;
  comprehension: HackersPaintersComprehensionQuestion[];
  speakingPrompt: HackersPaintersSpeakingPrompt;
  writingPrompt: HackersPaintersWritingPrompt;
};

const makeParagraphs = (page: number, texts: string[]): HackersPaintersParagraph[] =>
  texts.map((text, index) => ({
    id: `p${page}-${index + 1}`,
    page,
    text,
  }));

const image = (number: number) =>
  `/adult-reading/hackers-and-painters/pages/${String(number).padStart(2, "0")}.webp`;

const PAGE_20 = makeParagraphs(20, [
  "When I finished grad school in computer science I went to art school to study painting. A lot of people seemed surprised that someone interested in computers would also be interested in painting. They seemed to think that hacking and painting were very different kinds of work—that hacking was cold, precise, and methodical, and that painting was the frenzied expression of some primal urge.",
  "Both of these images are wrong. Hacking and painting have a lot in common. In fact, of all the different types of people I've known, hackers and painters are among the most alike.",
  "What hackers and painters have in common is that they're both makers. Along with composers, architects, and writers, what hackers and painters are trying to do is make good things. They're not doing research per se, though if in the course of trying to make good things they discover some new technique, so much the better.",
  "I've never liked the term \"computer science.\" The main reason I don't like it is that there's no such thing. Computer science is a grab bag of tenuously related areas thrown together by an accident of history, like Yugoslavia. At one end you have people who are really mathematicians, but call what they're doing computer science so they can get DARPA grants. In the middle you have people working on something like the natural history of computers—studying the behavior of algorithms for routing data through networks, for example. And then at the other extreme you have the hackers, who are trying to write interesting software, and for whom computers are just a medium of expression, as concrete is for architects or paint for painters. It's as if mathematicians, physicists, and architects all had to be in the same department.",
  "Sometimes what the hackers do is called \"software engineering,\" but this term is just as misleading. Good software designers are no more engineers than architects are. The border between architecture and engineering is not sharply defined, but it's there. It falls between what and how: architects decide what to do, and engineers figure out how to do it.",
]);

const PAGE_21 = makeParagraphs(21, [
  "What and how should not be kept too separate. You're asking for trouble if you try to decide what to do without understanding how to do it. But hacking can certainly be more than just deciding how to implement some spec. At its best, it's creating the spec—though it turns out the best way to do that is to implement it.",
  "Perhaps one day \"computer science\" will, like Yugoslavia, get broken up into its component parts. That might be a good thing. Especially if it meant independence for my native land, hacking.",
  "Bundling all these different types of work together in one department may be convenient administratively, but it's confusing intellectually. That's the other reason I don't like the name \"computer science.\" Arguably the people in the middle are doing something like an experimental science. But the people at either end, the hackers and the mathematicians, are not actually doing science.",
  "The mathematicians don't seem bothered by this. They happily set to work proving theorems like the other mathematicians over in the math department, and probably soon stop noticing that the building they work in says \"computer science\" on the outside. But for the hackers this label is a problem. If what they're doing is called science, it makes them feel they ought to be acting scientific. So instead of doing what they really want to do, which is to design beautiful software, hackers in universities and research labs feel they ought to be writing research papers.",
  "In the best case, the papers are just a formality. Hackers write cool software, and then write a paper about it, and the paper becomes a proxy for the achievement represented by the software. But often this mismatch causes problems. It's easy to drift away from building beautiful things toward building ugly things that make more suitable subjects for research papers.",
  "Unfortunately, beautiful things don't always make the best subjects for papers. Number one, research must be original—and as anyone who has written a PhD dissertation knows, the way to be sure you're exploring virgin territory is to to stake out a piece of ground that no one wants. Number two, research must be substantial—and awkward systems yield meatier papers, because you can write about the obstacles you have to overcome in order to get things done. Nothing yields meaty problems like starting with the wrong assumptions. Most of AI is an example of this rule; if you assume that knowledge can be represented as a list of predicate logic expressions whose arguments represent abstract concepts, you'll have a lot of papers to write about how to make this work. As Ricky Ricardo used to say, \"Lucy, you got a lot of explaining to do.\"",
]);

const PAGE_22 = makeParagraphs(22, [
  "The way to create something beautiful is often to make subtle tweaks to something that already exists, or to combine existing ideas in a slightly new way. This kind of work is hard to convey in a research paper.",
  "So why do universities and research labs continue to judge hackers by publications? For the same reason that \"scholastic aptitude\" gets measured by simple-minded standardized tests, or the productivity of programmers by lines of code. These tests are easy to apply, and there is nothing so tempting as an easy test that kind of works.",
  "Measuring what hackers are actually trying to do, designing beautiful software, would be much more difficult. You need a good sense of design to judge good design. And there is no correlation, except possibly a negative one, between people's ability to recognize good design and their confidence that they can.",
  "The only external test is time. Over time, beautiful things tend to thrive, and ugly things tend to get discarded. Unfortunately, the amounts of time involved can be longer than human lifetimes. Samuel Johnson said it took a hundred years for a writer's reputation to converge. You have to wait for the writer's influential friends to die, and then for all their followers to die.",
  "I think hackers just have to resign themselves to having a large random component in their reputations. In this they are no different from other makers. In fact, they're lucky by comparison. The influence of fashion is not nearly so great in hacking as it is in painting.",
  "There are worse things than having people misunderstand your work. A worse danger is that you will yourself misunderstand your work. Related fields are where you go looking for ideas. If you find yourself in the computer science department, there is a natural temptation to believe, for example, that hacking is the applied version of what theoretical computer science is the theory of. All the time I was in graduate school I had an uncomfortable feeling in the back of my mind that I ought to know more theory, and that it was very remiss of me to have forgotten all that stuff within three weeks of the final exam.",
]);

const PAGE_23 = makeParagraphs(23, [
  "Now I realize I was mistaken. Hackers need to understand the theory of computation about as much as painters need to understand paint chemistry. You need to know how to calculate time and space complexity, and perhaps also the concept of a state machine, in case you want to write a parser. Painters have to remember a good deal more about paint chemistry than that.",
  "I've found that the best sources of ideas are not the other fields that have the word \"computer\" in their names, but the other fields inhabited by makers. Painting has been a much richer source of ideas than the theory of computation.",
  "For example, I was taught in college that one ought to figure out a program completely on paper before even going near a computer. I found that I did not program this way. I found that I liked to program sitting in front of a computer, not a piece of paper. Worse still, instead of patiently writing out a complete program and assuring myself it was correct, I tended to just spew out code that was hopelessly broken, and gradually beat it into shape. Debugging, I was taught, was a kind of final pass where you caught typos and oversights. The way I worked, it seemed like programming consisted of debugging.",
  "For a long time I felt bad about this, just as I once felt bad that I didn't hold my pencil the way they taught me to in elementary school. If I had only looked over at the other makers, the painters or the architects, I would have realized that there was a name for what I was doing: sketching. As far as I can tell, the way they taught me to program in college was all wrong. You should figure out programs as you're writing them, just as writers and painters and architects do.",
  "Realizing this has real implications for software design. It means that a programming language should, above all, be malleable. A programming language is for thinking of programs, not for expressing programs you've already thought of. It should be a pencil, not a pen. Static typing would be a fine idea if people actually did write programs the way they taught me to in college. But that's not how any of the hackers I know write programs. We need a language that lets us scribble and smudge and smear, not a language where you have to sit with a teacup of types balanced on your knee and make polite conversation with a strict old aunt of a compiler.",
  "While we're on the subject of static typing, identifying with the makers will save us from another problem that afflicts the sciences: math envy. Everyone in the sciences secretly believes that mathematicians are smarter than they are. I think mathematicians also believe this. At any rate, the result is that scientists tend to make their work look as mathematical as possible. In a field like physics this probably doesn't do much harm, but the further you get from the natural sciences, the more of a problem it becomes.",
]);

const PAGE_24 = makeParagraphs(24, [
  "A page of formulas just looks so impressive. (Tip: for extra impressiveness, use Greek variables.) And so there is a great temptation to work on problems you can treat formally, rather than problems that are, say, important.",
  "If hackers identified with other makers, like writers and painters, they wouldn't feel tempted to do this. Writers and painters don't suffer from math envy. They feel as if they're doing something completely unrelated. So are hackers, I think.",
  "If universities and research labs keep hackers from doing the kind of work they want to do, perhaps the place for them is in companies. Unfortunately, most companies won't let hackers do what they want either. Universities and research labs force hackers to be scientists, and companies force them to be engineers.",
  "I only discovered this myself quite recently. When Yahoo bought Viaweb, they asked me what I wanted to do. I had never liked business much, and said that I just wanted to hack. When I got to Yahoo, I found that what hacking meant to them was implementing software, not designing it. Programmers were seen as technicians who translated the visions (if that is the word) of product managers into code.",
  "This seems to be the default plan in big companies. They do it because it decreases the standard deviation of the outcome. Only a small percentage of hackers can actually design software, and it's hard for the people running a company to pick these out. So instead of entrusting the future of the software to one brilliant hacker, most companies set things up so that it is designed by committee, and the hackers merely implement the design.",
  "If you want to make money at some point, remember this, because this is one of the reasons startups win. Big companies want to decrease the standard deviation of design outcomes because they want to avoid disasters. But when you damp oscillations, you lose the high points as well as the low. This is not a problem for big companies, because they don't win by making great products. Big companies win by sucking less than other big companies.",
]);

const PAGE_25 = makeParagraphs(25, [
  "So if you can figure out a way to get in a design war with a company big enough that its software is designed by product managers, they'll never be able to keep up with you. These opportunities are not easy to find, though. It's hard to engage a big company in a design war, just as it's hard to engage an opponent inside a castle in hand-to-hand combat. It would be pretty easy to write a better word processor than Microsoft Word, for example, but Microsoft, within the castle of their operating system monopoly, probably wouldn't even notice if you did.",
  "The place to fight design wars is in new markets, where no one has yet managed to establish any fortifications. That's where you can win big by taking the bold approach to design, and having the same people both design and implement the product. Microsoft themselves did this at the start. So did Apple. And Hewlett-Packard. I suspect almost every successful startup has.",
  "So one way to build great software is to start your own startup. There are two problems with this, though. One is that in a startup you have to do so much besides write software. At Viaweb I considered myself lucky if I got to hack a quarter of the time. And the things I had to do the other three quarters of the time ranged from tedious to terrifying. I have a benchmark for this, because I once had to leave a board meeting to have some cavities filled. I remember sitting back in the dentist's chair, waiting for the drill, and feeling like I was on vacation.",
  "The other problem with startups is that there is not much overlap between the kind of software that makes money and the kind that's interesting to write. Programming languages are interesting to write, and Microsoft's first product was one, in fact, but no one will pay for programming languages now. If you want to make money, you tend to be forced to work on problems that are too nasty for anyone to solve for free.",
  "All makers face this problem. Prices are determined by supply and demand, and there is just not as much demand for things that are fun to work on as there is for things that solve the mundane problems of individual customers. Acting in off-Broadway plays doesn't pay as well as wearing a gorilla suit in someone's booth at a trade show. Writing novels doesn't pay as well as writing ad copy for garbage disposals. And hacking programming languages doesn't pay as well as figuring out how to connect some company's legacy database to their web server.",
]);

const PAGE_26 = makeParagraphs(26, [
  "I think the answer to this problem, in the case of software, is a concept known to nearly all makers: the day job. This phrase began with musicians, who perform at night. More generally, it means you have one kind of work you do for money, and another for love.",
  "Nearly all makers have day jobs early in their careers. Painters and writers notoriously do. If you're lucky you can get a day job closely related to your real work. Musicians often seem to work in record stores. A hacker working on some programming language or operating system might likewise be able to get a day job using it.",
  "When I say that the answer is for hackers to have day jobs, and work on beautiful software on the side, I'm not proposing this as a new idea. This is what open source hacking is all about. What I'm saying is that open source is probably the right model, because it has been independently confirmed by all the other makers.",
  "It seems surprising to me that any employer would be reluctant to let hackers work on open source projects. At Viaweb, we would have been reluctant to hire anyone who didn't. When we interviewed programmers, the main thing we cared about was what kind of software they wrote in their spare time. You can't do anything really well unless you love it, and if you love to hack you'll inevitably be working on projects of your own.",
  "Because hackers are makers rather than scientists, the right place to look for metaphors is not in the sciences, but among other kinds of makers. What else can painting teach us about hacking?",
  "One thing we can learn, or at least confirm, from the example of painting is how to learn to hack. You learn to paint mostly by doing it. Ditto for hacking. Most hackers don't learn to hack by taking college courses in programming. They learn by writing programs of their own at age thirteen. Even in college classes, you learn to hack mostly by hacking.",
  "Because painters leave a trail of work behind them, you can watch them learn by doing. If you look at the work of a painter in chronological order, you'll find that each painting builds on things learned in previous ones. When there's something in a painting that works especially well, you can usually find version 1 of it in a smaller form in some earlier painting.",
]);

const PAGE_27 = makeParagraphs(27, [
  "I think most makers work this way. Writers and architects seem to as well. Maybe it would be good for hackers to act more like painters, and regularly start over from scratch, instead of continuing to work for years on one project, and trying to incorporate all their later ideas as revisions.",
  "The fact that hackers learn to hack by doing it is another sign of how different hacking is from the sciences. Scientists don't learn science by doing it, but by doing labs and problem sets. Scientists start out doing work that's perfect, in the sense that they're just trying to reproduce work someone else has already done for them. Eventually, they get to the point where they can do original work. Whereas hackers, from the start, are doing original work; it's just very bad. So hackers start original, and get good, and scientists start good, and get original.",
  "The other way makers learn is from examples. To a painter, a museum is a reference library of techniques. For hundreds of years it has been part of the traditional education of painters to copy the works of the great masters, because copying forces you to look closely at the way a painting is made.",
  "Writers do this too. Benjamin Franklin learned to write by summarizing the points in the essays of Addison and Steele and then trying to reproduce them. Raymond Chandler did the same thing with detective stories.",
  "Hackers, likewise, can learn to program by looking at good programs—not just at what they do, but at the source code. One of the less publicized benefits of the open source movement is that it has made it easier to learn to program. When I learned to program, we had to rely mostly on examples in books. The one big chunk of code available then was Unix, but even this was not open source. Most of the people who read the source read it in illicit photocopies of John Lions' book, which though written in 1977 was not allowed to be published until 1996.",
  "Another example we can take from painting is the way that paintings are created by gradual refinement. Paintings usually begin with a sketch. Gradually the details get filled in. But it is not merely a process of filling in. Sometimes the original plans turn out to be mistaken. Countless paintings, when you look at them in x-rays, turn out to have limbs that have been moved or facial features that have been readjusted.",
]);

const PAGE_28 = makeParagraphs(28, [
  "Here's a case where we can learn from painting. I think hacking should work this way too. It's unrealistic to expect that the specifications for a program will be perfect. You're better off if you admit this up front, and write programs in a way that allows specifications to change on the fly.",
  "(The structure of large companies makes this hard for them to do, so here is another place where startups have an advantage.)",
  "Everyone by now presumably knows about the danger of premature optimization. I think we should be just as worried about premature design—deciding too early what a program should do.",
  "The right tools can help us avoid this danger. A good programming language should, like oil paint, make it easy to change your mind. Dynamic typing is a win here because you don't have to commit to specific data representations up front. But the key to flexibility, I think, is to make the language very abstract. The easiest program to change is one that's short.",
  "Figure 2-1. Leonardo's Ginevra de' Benci, 1474.",
]);

const PAGE_29 = makeParagraphs(29, [
  "This sounds like a paradox, but a great painting has to be better than it has to be. For example, when Leonardo painted the portrait of Ginevra de' Benci in the National Gallery, he put a juniper bush behind her head. In it he carefully painted each individual leaf. Many painters might have thought, this is just something to put in the background to frame her head. No one will look that closely at it.",
  "Not Leonardo. How hard he worked on part of a painting didn't depend at all on how closely he expected anyone to look at it. He was like Michael Jordan. Relentless.",
  "Relentlessness wins because, in the aggregate, unseen details become visible. When people walk by the portrait of Ginevra de' Benci, their attention is often immediately arrested by it, even before they look at the label and notice that it says Leonardo da Vinci. All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune.",
  "Great software, likewise, requires a fanatical devotion to beauty. If you look inside good software, you find that parts no one is ever supposed to see are beautiful too. When it comes to code I behave in a way that would make me eligible for prescription drugs if I approached everyday life the same way. It drives me crazy to see code that's badly indented, or that uses ugly variable names.",
  "If a hacker were a mere implementor, turning a spec into code, then he could just work his way through it from one end to the other like someone digging a ditch. But if the hacker is a creator, we have to take inspiration into account.",
  "In hacking, like painting, work comes in cycles. Sometimes you get excited about a new project and you want to work sixteen hours a day on it. Other times nothing seems interesting.",
  "To do good work you have to take these cycles into account, because they're affected by how you react to them. When you're driving a car with a manual transmission on a hill, you have to back off the clutch sometimes to avoid stalling. Backing off can likewise prevent ambition from stalling. In both painting and hacking there are some tasks that are terrifyingly ambitious, and others that are comfortingly routine. It's a good idea to save some easy tasks for moments when you would otherwise stall.",
]);

const PAGE_30 = makeParagraphs(30, [
  "In hacking, this can literally mean saving up bugs. I like debugging: it's the one time that hacking is as straightforward as people think it is. You have a totally constrained problem, and all you have to do is solve it. Your program is supposed to do x. Instead it does y. Where does it go wrong? You know you're going to win in the end. It's as relaxing as painting a wall.",
  "The example of painting can teach us not only how to manage our own work, but how to work together. A lot of the great art of the past is the work of multiple hands, though there may only be one name on the wall next to it in the museum. Leonardo was an apprentice in the workshop of Verrocchio and painted one of the angels in his Baptism of Christ. This sort of thing was the rule, not the exception. Michelangelo was considered especially dedicated for insisting on painting all the figures on the ceiling of the Sistine Chapel himself.",
  "As far as I know, when painters worked together on a painting, they never worked on the same parts. It was common for the master to paint the principal figures and for assistants to paint the others and the background. But you never had one guy painting over the work of another.",
  "I think this is the right model for collaboration in software too. Don't push it too far. When a piece of code is being hacked by three or four different people, no one of whom really owns it, it will end up being like a common-room. It will tend to feel bleak and abandoned, and accumulate cruft. The right way to collaborate, I think, is to divide projects into sharply defined modules, each with a definite owner, and with interfaces between them that are as carefully designed and, if possible, as articulated as programming languages.",
  "Like painting, most software is intended for a human audience. And so hackers, like painters, must have empathy to do really great work. You have to be able to see things from the user's point of view.",
  "When I was a kid I was constantly being told to look at things from someone else's point of view. What this always meant in practice was to do what someone else wanted, instead of what I wanted. This of course gave empathy a bad name, and I made a point of not cultivating it.",
]);

const PAGE_31 = makeParagraphs(31, [
  "Boy, was I wrong. It turns out that looking at things from other people's point of view is practically the secret of success.",
  "Empathy doesn't necessarily mean being self-sacrificing. Far from it. Understanding how someone else sees things doesn't imply that you'll act in his interest; in some situations—in war, for example—you want to do exactly the opposite.",
  "Most makers make things for a human audience. And to engage an audience you have to understand what they need. Nearly all the greatest paintings are paintings of people, for example, because people are what people are interested in.",
  "Empathy is probably the single most important difference between a good hacker and a great one. Some hackers are quite smart, but practically solipsists when it comes to empathy. It's hard for such people to design great software, because they can't see things from the user's point of view.",
  "One way to tell how good people are at empathy is to watch them explain a technical matter to someone without a technical background. We probably all know people who, though otherwise smart, are just comically bad at this. If someone asks them at a dinner party what a programming language is, they'll say something like \"Oh, a high-level language is what the compiler uses as input to generate object code.\" High-level language? Compiler? Object code? Someone who doesn't know what a programming language is obviously doesn't know what these things are, either.",
  "Part of what software has to do is explain itself. So to write good software you have to understand how little users understand. They're going to walk up to the software with no preparation, and it had better do what they guess it will, because they're not going to read the manual. The best system I've ever seen in this respect was the original Macintosh, in 1984. It did what software almost never does: it just worked.",
  "Source code, too, should explain itself. If I could get people to remember just one quote about programming, it would be the one at the beginning of Structure and Interpretation of Computer Programs.",
]);

const PAGE_32 = makeParagraphs(32, [
  "Programs should be written for people to read, and only incidentally for machines to execute.",
  "Figure 2-2. Piero della Francesca's Federico da Montefeltro, 1465-66 (detail).",
  "You need to have empathy not just for your users, but for your readers. It's in your interest, because you'll be one of them. Many a hacker has written a program only to find on returning to it six months later that he has no idea how it works. I know several people who've sworn off Perl after such experiences.",
  "Lack of empathy is associated with intelligence, to the point that there is even something of a fashion for it in some places. But I don't think there's any correlation. You can do well in math and the natural sciences without having to learn empathy, and people in these fields tend to be smart, so the two qualities have come to be associated. But there are plenty of dumb people who are bad at empathy too.",
  "So, if hacking works like painting and writing, is it as cool? After all, you only get one life. You might as well spend it working on something great.",
]);

const PAGE_33 = makeParagraphs(33, [
  "Unfortunately, the question is hard to answer. There is always a big time lag in prestige. It's like light from a distant star. Painting has prestige now because of great work people did five hundred years ago. At the time, no one thought these paintings were as important as we do today. It would have seemed very odd to people in 1465 that Federico da Montefeltro, the Duke of Urbino, would one day be known mostly as the guy with the strange nose in a painting by Piero della Francesca.",
  "So while I admit that hacking doesn't seem as cool as painting now, we should remember that painting itself didn't seem as cool in its glory days as it does now.",
  "What we can say with some confidence is that these are the glory days of hacking. In most fields the great work is done early on. The paintings made between 1430 and 1500 are still unsurpassed. Shakespeare appeared just as professional theater was being born, and pushed the medium so far that every playwright since has had to live in his shadow. Albrecht Dürer did the same thing with engraving, and Jane Austen with the novel.",
  "Over and over we see the same pattern. A new medium appears, and people are so excited about it that they explore most of its possibilities in the first couple generations. Hacking seems to be in this phase now.",
  "Painting was not, in Leonardo's time, as cool as his work helped make it. How cool hacking turns out to be will depend on what we can do with this new medium.",
]);

export const HACKERS_PAINTERS_UNITS: HackersPaintersUnit[] = [
  {
    id: "makers",
    title: "Hackers Are Makers",
    titleZh: "黑客也是创作者",
    pdfPages: [20, 21, 22],
    pageImages: [image(1), image(2), image(3)],
    guidingQuestion: "Why does Graham compare hackers with painters rather than scientists?",
    guidingQuestionZh: "为什么 Graham 认为黑客更像画家，而不是科学家？",
    paragraphs: [...PAGE_20, ...PAGE_21, ...PAGE_22],
    targetWords: [
      { word: "methodical", ipa: "/məˈθɒdɪkəl/", definition: "done in an orderly and careful way", definitionZh: "有条理的；仔细的", collocation: "a methodical approach" },
      { word: "tenuously", ipa: "/ˈtenjuəsli/", definition: "in a way that has only a weak or slight connection", definitionZh: "联系薄弱地", collocation: "tenuously related areas" },
      { word: "proxy", ipa: "/ˈprɒksi/", definition: "something used to represent or measure something else", definitionZh: "替代物；间接衡量", collocation: "a proxy for achievement" },
      { word: "subtle", ipa: "/ˈsʌtl/", definition: "small but important, and not immediately obvious", definitionZh: "微妙的；不明显的", collocation: "make subtle tweaks" },
    ],
    sentenceLab: {
      sentence: "What hackers and painters have in common is that they're both makers.",
      chunks: [
        { text: "What hackers and painters have in common", role: "subject clause", roleZh: "主语从句：两者的共同点" },
        { text: " is", role: "linking verb", roleZh: "系动词：把问题与答案连起来" },
        { text: " that they're both makers.", role: "complement clause", roleZh: "表语从句：说明共同点是什么" },
      ],
      explanationZh: "What 引导的名词性从句整体充当主语；that 从句给出具体答案。可用这个句型表达两件事的核心共性。",
    },
    comprehension: [
      { prompt: "What do hackers and painters mainly share, according to Graham?", promptZh: "Graham 认为黑客和画家最核心的共同点是什么？", options: ["They both conduct experiments", "They both make good things", "They both follow fixed specifications", "They both seek academic status"], answerIndex: 1, explanation: "Graham calls both groups makers whose goal is to make good things." },
      { prompt: "Why does the label 'computer science' trouble university hackers?", promptZh: "“计算机科学”这一标签为什么会困扰大学里的黑客？", options: ["It makes them avoid computers", "It suggests they should produce scientific papers", "It prevents them from learning mathematics", "It forces them to attend art school"], answerIndex: 1, explanation: "The scientific label encourages hackers to optimize for papers instead of beautiful software." },
      { prompt: "Why are publications an attractive test for institutions?", promptZh: "为什么机构容易用发表论文来评价黑客？", options: ["They perfectly measure design", "They predict long-term reputation", "They are easy to apply and partly work", "They eliminate fashion"], answerIndex: 2, explanation: "Graham argues that easy tests are tempting even when they only roughly measure the real goal." },
    ],
    speakingPrompt: {
      prompt: "Explain whether your own work is closer to making, science, or engineering. Give one example.",
      promptZh: "说说你的工作更像创作、科学还是工程，并举一个例子。",
      starters: ["I see my work mainly as...", "A good example is...", "Unlike pure research, I..."],
    },
    writingPrompt: {
      prompt: "Write 100-130 words: Is 'computer science' a useful name for the field? Use one idea from the text and one example of your own.",
      promptZh: "用 100–130 词回答：“计算机科学”是一个好名称吗？引用文中一个观点，再加一个自己的例子。",
      starter: "The name 'computer science' is useful / misleading because...",
    },
  },
  {
    id: "designers-not-implementors",
    title: "Designers, Not Implementors",
    titleZh: "设计者，不只是实现者",
    pdfPages: [23, 24, 25],
    pageImages: [image(4), image(5), image(6)],
    guidingQuestion: "What is lost when hackers are treated as technicians who only implement other people's designs?",
    guidingQuestionZh: "如果只把程序员当作实现别人设计的技术人员，会损失什么？",
    paragraphs: [...PAGE_23, ...PAGE_24, ...PAGE_25],
    targetWords: [
      { word: "malleable", ipa: "/ˈmæliəbəl/", definition: "easy to shape or change", definitionZh: "可塑的；易于改变的", collocation: "a malleable language" },
      { word: "entrust", ipa: "/ɪnˈtrʌst/", definition: "to give someone responsibility for something important", definitionZh: "委托；托付", collocation: "entrust the future to someone" },
      { word: "damp", ipa: "/dæmp/", definition: "to reduce the strength of a movement or effect", definitionZh: "抑制；减弱", collocation: "damp oscillations" },
      { word: "mundane", ipa: "/mʌnˈdeɪn/", definition: "ordinary and not very interesting", definitionZh: "日常平凡的；乏味的", collocation: "mundane problems" },
    ],
    sentenceLab: {
      sentence: "A programming language is for thinking of programs, not for expressing programs you've already thought of.",
      chunks: [
        { text: "A programming language", role: "subject", roleZh: "主语：讨论的工具" },
        { text: " is for thinking of programs", role: "positive purpose", roleZh: "正面用途：帮助你思考程序" },
        { text: ", not for expressing programs", role: "contrast", roleZh: "否定对比：不只是写出既定结果" },
        { text: " you've already thought of.", role: "relative clause", roleZh: "定语从句：修饰 programs" },
      ],
      explanationZh: "A is for X, not for Y 用对比强调真正用途。最后的定语从句省略了 that，完整形式是 programs that you've already thought of。",
    },
    comprehension: [
      { prompt: "Why does Graham compare a programming language to a pencil?", promptZh: "Graham 为什么把编程语言比作铅笔？", options: ["It should make formal proofs easier", "It should support exploration and revision", "It should prevent broken code", "It should make code permanent"], answerIndex: 1, explanation: "A pencil represents a malleable tool for thinking, sketching, and changing ideas." },
      { prompt: "According to Graham, why do big companies separate design from implementation?", promptZh: "作者认为大公司为什么把设计与实现分开？", options: ["To create bolder products", "To lower the variation and risk of outcomes", "To give hackers more freedom", "To enter new markets faster"], answerIndex: 1, explanation: "They trade exceptional high points for predictability and fewer disasters." },
      { prompt: "Where does Graham think a startup can best fight a design war?", promptZh: "Graham 认为初创公司最适合在哪里打“设计战”？", options: ["Inside an established monopoly", "In academic publishing", "In a new market without fortifications", "In a committee-led product team"], answerIndex: 2, explanation: "New markets do not yet protect incumbents, so bold integrated design can win." },
    ],
    speakingPrompt: {
      prompt: "Describe a product that feels designed by its makers rather than by a committee. What evidence do you notice?",
      promptZh: "介绍一个你觉得由创作者主导、而不是委员会设计的产品。你看到了哪些证据？",
      starters: ["The product I have in mind is...", "It feels coherent because...", "One detail that supports my view is..."],
    },
    writingPrompt: {
      prompt: "Write 120-150 words comparing a big company's design process with a startup's process.",
      promptZh: "用 120–150 词对比大公司和初创公司的设计流程。",
      starter: "A big company often reduces risk by..., whereas a startup can...",
    },
  },
  {
    id: "learn-by-making",
    title: "Learn by Making",
    titleZh: "在创作中学习",
    pdfPages: [26, 27],
    pageImages: [image(7), image(8)],
    guidingQuestion: "How do makers become good at their craft?",
    guidingQuestionZh: "创作者是怎样逐渐掌握一门技艺的？",
    paragraphs: [...PAGE_26, ...PAGE_27],
    targetWords: [
      { word: "reluctant", ipa: "/rɪˈlʌktənt/", definition: "not willing or eager to do something", definitionZh: "不情愿的；勉强的", collocation: "be reluctant to hire" },
      { word: "inevitably", ipa: "/ɪnˈevɪtəbli/", definition: "in a way that cannot be avoided", definitionZh: "不可避免地；必然地", collocation: "inevitably work on projects" },
      { word: "chronological", ipa: "/ˌkrɒnəˈlɒdʒɪkəl/", definition: "arranged in the order in which events happened", definitionZh: "按时间顺序的", collocation: "in chronological order" },
      { word: "refinement", ipa: "/rɪˈfaɪnmənt/", definition: "a small change that improves something", definitionZh: "改进；精炼", collocation: "gradual refinement" },
    ],
    sentenceLab: {
      sentence: "So hackers start original, and get good, and scientists start good, and get original.",
      chunks: [
        { text: "So hackers start original", role: "first starting point", roleZh: "黑客的起点：原创" },
        { text: ", and get good", role: "first development", roleZh: "黑客的发展：逐渐变好" },
        { text: ", and scientists start good", role: "contrasting starting point", roleZh: "科学家的对比起点：先做对" },
        { text: ", and get original.", role: "contrasting development", roleZh: "科学家的发展：最后原创" },
      ],
      explanationZh: "作者用 start A, get B 的平行结构做交叉对比：黑客从不成熟的原创作品出发，科学家则先复现成熟结果，再到原创研究。",
    },
    comprehension: [
      { prompt: "What does a 'day job' allow a maker to do?", promptZh: "“本职工作”为创作者提供了什么？", options: ["Avoid all paid work", "Earn money while keeping separate work for love", "Publish only academic work", "Stop making personal projects"], answerIndex: 1, explanation: "A day job supports the maker financially while leaving room for personally meaningful work." },
      { prompt: "How do hackers mainly learn, according to the text?", promptZh: "按照文章，黑客主要如何学习？", options: ["By memorizing theory", "By writing programs", "By avoiding early mistakes", "By waiting for formal instruction"], answerIndex: 1, explanation: "Like painters, hackers learn their craft mostly by doing it." },
      { prompt: "Why is copying great work useful for a learner?", promptZh: "临摹优秀作品为什么有助于学习？", options: ["It removes the need for original work", "It forces close attention to technique", "It guarantees commercial success", "It replaces practice"], answerIndex: 1, explanation: "Careful copying reveals how a work was constructed and expands the learner's techniques." },
    ],
    speakingPrompt: {
      prompt: "Describe something you learned mainly by doing. How did your early attempts help?",
      promptZh: "说一件你主要靠实践学会的事。早期的尝试如何帮助了你？",
      starters: ["I learned... mostly by...", "At first, my work was...", "Each attempt taught me..."],
    },
    writingPrompt: {
      prompt: "Write 100-130 words explaining a practical plan for learning a difficult skill through projects and examples.",
      promptZh: "用 100–130 词制定一个通过项目和优秀范例学习难度较高技能的计划。",
      starter: "To learn this skill, I would begin by making...",
    },
  },
  {
    id: "gradual-refinement",
    title: "Change Your Mind",
    titleZh: "在反复修改中创作",
    pdfPages: [28, 29],
    pageImages: [image(9), image(10)],
    guidingQuestion: "Why should software, like a painting, remain easy to revise?",
    guidingQuestionZh: "为什么软件应该像绘画一样，在创作中保持可修改性？",
    paragraphs: [...PAGE_28, ...PAGE_29],
    targetWords: [
      { word: "premature", ipa: "/ˌpreməˈtʃʊə/", definition: "happening too early, before the right time", definitionZh: "过早的；不成熟的", collocation: "premature design" },
      { word: "abstract", ipa: "/ˈæbstrækt/", definition: "expressing general ideas rather than specific details", definitionZh: "抽象的；概括的", collocation: "a highly abstract language" },
      { word: "relentless", ipa: "/rɪˈlentləs/", definition: "continuing with great determination without stopping", definitionZh: "坚持不懈的；不停歇的", collocation: "relentless attention to detail" },
      { word: "fanatical", ipa: "/fəˈnætɪkəl/", definition: "showing extremely strong enthusiasm or devotion", definitionZh: "狂热的；极度投入的", collocation: "a fanatical devotion to beauty" },
    ],
    sentenceLab: {
      sentence: "Relentlessness wins because, in the aggregate, unseen details become visible.",
      chunks: [
        { text: "Relentlessness wins", role: "main claim", roleZh: "主要结论：坚持到底会赢" },
        { text: " because", role: "reason marker", roleZh: "原因连词" },
        { text: ", in the aggregate", role: "framing phrase", roleZh: "视角状语：从总体效果来看" },
        { text: ", unseen details become visible.", role: "reason clause", roleZh: "原因从句：不起眼的细节汇聚成可感知的品质" },
      ],
      explanationZh: "in the aggregate 表示“综合起来看”。单个细节可能不会被发现，但所有细节叠加后，整体品质就会变得明显。",
    },
    comprehension: [
      { prompt: "What is premature design?", promptZh: "什么是“过早设计”？", options: ["Improving details slowly", "Deciding too early what a program should do", "Writing a short program", "Changing data representations"], answerIndex: 1, explanation: "It means committing to the program's purpose before enough has been learned through making it." },
      { prompt: "Which quality does Graham value in a programming language here?", promptZh: "这里 Graham 最看重编程语言的哪种特性？", options: ["Length", "Formality", "Flexibility", "Popularity"], answerIndex: 2, explanation: "The right language should make changing one's mind easy." },
      { prompt: "What lesson does Leonardo's juniper bush illustrate?", promptZh: "达·芬奇画杜松叶的例子说明了什么？", options: ["Background details never matter", "Only visible code deserves care", "Unseen details combine into overall excellence", "Creators should work as quickly as possible"], answerIndex: 2, explanation: "Care invested in apparently unseen details becomes perceptible in the total effect." },
    ],
    speakingPrompt: {
      prompt: "Talk about a time when changing an early plan improved your work.",
      promptZh: "说说你曾经修改早期计划、并因此改进作品的一次经历。",
      starters: ["My original plan was...", "I changed it after I noticed...", "The result improved because..."],
    },
    writingPrompt: {
      prompt: "Write 100-130 words: Which matters more, a perfect plan or the ability to revise? Defend your answer.",
      promptZh: "用 100–130 词回答：完美计划和修改能力，哪一个更重要？说明理由。",
      starter: "The ability to revise / a strong initial plan matters more because...",
    },
  },
  {
    id: "collaboration-and-empathy",
    title: "Ownership and Empathy",
    titleZh: "协作中的责任与共情",
    pdfPages: [30, 31, 32],
    pageImages: [image(11), image(12), image(13)],
    guidingQuestion: "How do clear ownership and empathy help people build better software?",
    guidingQuestionZh: "清晰的责任归属和共情如何帮助人们创造更好的软件？",
    paragraphs: [...PAGE_30, ...PAGE_31, ...PAGE_32],
    targetWords: [
      { word: "constrained", ipa: "/kənˈstreɪnd/", definition: "limited or restricted by clear conditions", definitionZh: "受限制的；有明确边界的", collocation: "a constrained problem" },
      { word: "articulated", ipa: "/ɑːˈtɪkjəleɪtɪd/", definition: "expressed or defined clearly", definitionZh: "清楚表达的；明确界定的", collocation: "carefully articulated interfaces" },
      { word: "empathy", ipa: "/ˈempəθi/", definition: "the ability to understand another person's feelings or viewpoint", definitionZh: "共情；理解他人视角的能力", collocation: "have empathy for users" },
      { word: "incidentally", ipa: "/ˌɪnsɪˈdentəli/", definition: "as a secondary or less important result", definitionZh: "附带地；次要地", collocation: "only incidentally for machines" },
    ],
    sentenceLab: {
      sentence: "Programs should be written for people to read, and only incidentally for machines to execute.",
      chunks: [
        { text: "Programs", role: "subject", roleZh: "主语：程序" },
        { text: " should be written", role: "passive recommendation", roleZh: "被动建议：应当被编写" },
        { text: " for people to read", role: "primary purpose", roleZh: "首要目的：让人阅读" },
        { text: ", and only incidentally for machines to execute.", role: "secondary purpose", roleZh: "次要目的：让机器执行" },
      ],
      explanationZh: "for + 名词 + to do 用来表示“为了让谁做什么”。only incidentally 刻意颠倒了常见的优先级，强调代码首先要对人清楚。",
    },
    comprehension: [
      { prompt: "How does Graham recommend dividing collaborative software work?", promptZh: "Graham 建议怎样划分软件协作？", options: ["Let everyone edit every part", "Give clear modules definite owners", "Avoid interfaces", "Use one giant shared file"], answerIndex: 1, explanation: "He favors sharply defined modules, clear owners, and carefully designed interfaces." },
      { prompt: "Why is empathy crucial for a software designer?", promptZh: "共情为什么对软件设计者至关重要？", options: ["Users always read manuals", "It helps designers see what users need and expect", "It makes code run faster", "It replaces technical skill"], answerIndex: 1, explanation: "Software must make sense to unprepared users, so its maker needs their point of view." },
      { prompt: "Who are the 'readers' of source code?", promptZh: "源代码的“读者”包括谁？", options: ["Only compilers", "Only current users", "Other programmers and the future author", "Only product managers"], answerIndex: 2, explanation: "Readable code helps collaborators and the same hacker returning months later." },
    ],
    speakingPrompt: {
      prompt: "Explain a technical idea to a nontechnical listener without jargon.",
      promptZh: "不使用行话，向一位非技术听众解释一个技术概念。",
      starters: ["In simple terms, it is like...", "You use it when...", "The important thing to know is..."],
    },
    writingPrompt: {
      prompt: "Rewrite a confusing instruction, error message, or technical explanation so a first-time user can understand it. Then explain two choices you made.",
      promptZh: "改写一条难懂的说明、错误信息或技术解释，让初次使用者能看懂；再说明你做的两个表达选择。",
      starter: "Original: ...\nClear version: ...\nI changed... because...",
    },
  },
  {
    id: "new-medium",
    title: "A New Medium",
    titleZh: "一种新的创作媒介",
    pdfPages: [33],
    pageImages: [image(14)],
    guidingQuestion: "What will determine the future prestige of hacking?",
    guidingQuestionZh: "什么将决定黑客创作未来的声望和地位？",
    paragraphs: [...PAGE_33],
    targetWords: [
      { word: "prestige", ipa: "/preˈstiːʒ/", definition: "respect and admiration attached to high achievement", definitionZh: "声望；威望", collocation: "a time lag in prestige" },
      { word: "unsurpassed", ipa: "/ˌʌnsəˈpɑːst/", definition: "better than or equal to anything else of its kind", definitionZh: "无与伦比的；未被超越的", collocation: "remain unsurpassed" },
      { word: "medium", ipa: "/ˈmiːdiəm/", definition: "a form or material used to create and communicate art or ideas", definitionZh: "媒介；表达手段", collocation: "a new medium appears" },
      { word: "possibility", ipa: "/ˌpɒsəˈbɪləti/", definition: "something that can be done or may happen", definitionZh: "可能性；可实现的方向", collocation: "explore its possibilities" },
    ],
    sentenceLab: {
      sentence: "How cool hacking turns out to be will depend on what we can do with this new medium.",
      chunks: [
        { text: "How cool hacking turns out to be", role: "subject clause", roleZh: "主语从句：黑客创作最终有多大影响力" },
        { text: " will depend on", role: "main verb phrase", roleZh: "主要谓语：将取决于" },
        { text: " what we can do", role: "object clause", roleZh: "宾语从句：我们能做出什么" },
        { text: " with this new medium.", role: "means phrase", roleZh: "方式短语：使用这种新媒介" },
      ],
      explanationZh: "这句话同时使用两个间接疑问从句。从句中使用陈述语序，所以是 how cool hacking turns out to be 和 what we can do，而不是直接疑问语序。",
    },
    comprehension: [
      { prompt: "Why does painting have high prestige now?", promptZh: "为什么绘画现在拥有很高的声望？", options: ["Painters were famous immediately", "Great work accumulated historical recognition", "It is newer than hacking", "It has no commercial pressure"], answerIndex: 1, explanation: "Today's prestige reflects outstanding work created centuries ago, after a long delay." },
      { prompt: "What pattern does Graham see when a new medium appears?", promptZh: "Graham 认为新媒介出现时通常有什么规律？", options: ["Its possibilities are ignored", "Most great work waits many centuries", "Early generations enthusiastically explore its possibilities", "It immediately gains maximum prestige"], answerIndex: 2, explanation: "Excitement about a new medium drives intensive exploration in its first generations." },
      { prompt: "What will make hacking 'cool' in the long run?", promptZh: "从长期看，什么会让黑客创作变得重要？", options: ["Its current job titles", "The work people create with the medium", "Comparisons with mathematics", "The age of its tools"], answerIndex: 1, explanation: "Its standing will be earned by what makers accomplish with the medium." },
    ],
    speakingPrompt: {
      prompt: "Name a new medium or technology today. What important work might people create with it?",
      promptZh: "举出一种当代的新媒介或新技术，说说人们可能用它创造什么重要作品。",
      starters: ["A medium still in its early days is...", "Its possibilities include...", "It may become important if..."],
    },
    writingPrompt: {
      prompt: "Write 120-150 words arguing whether these are still the glory days of hacking.",
      promptZh: "用 120–150 词论证：当下是否仍然是黑客创作的黄金时代？",
      starter: "I believe these are / are no longer the glory days of hacking because...",
    },
  },
];
