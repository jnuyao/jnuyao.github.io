export type StoryGuidePage = {
  introZh: string;
  englishPassage: string;
  explanationZh: string;
  repeatAfterMe: string;
  prompt?: string;
  narration: string;
  keyEnglish: string;
  audioSrc: string;
};

export type StoryGuide = {
  languageLabel: string;
  title: string;
  pages: StoryGuidePage[];
};

type StoryGuidePageInput = Pick<
  StoryGuidePage,
  "introZh" | "englishPassage" | "explanationZh" | "repeatAfterMe" | "prompt"
>;

function narrationFor(page: StoryGuidePageInput): string {
  return [
    page.introZh,
    "现在，先完整听一遍这一页的英文。",
    page.englishPassage,
    page.explanationZh,
    `最后，跟我读：${page.repeatAfterMe}`,
    page.prompt ? `想一想：${page.prompt}` : "",
  ].filter(Boolean).join(" ");
}

const makeGuidePages = (
  slug: string,
  pages: StoryGuidePageInput[],
): StoryGuidePage[] => pages.map((page, index) => ({
  ...page,
  narration: narrationFor(page),
  keyEnglish: page.repeatAfterMe,
  audioSrc: `/story-guide-audio/${slug}/${String(index + 1).padStart(2, "0")}.mp3`,
}));

export const STORY_GUIDES: Partial<Record<string, StoryGuide>> = {
  "danny-dinosaur-ride-a-bike": {
    languageLabel: "中文引导 + 完整英文 + 跟读",
    title: "听懂故事，学会英文",
    pages: makeGuidePages("danny-dinosaur-ride-a-bike", [
      {
        introZh: "先看看封面，Danny 和恐龙朋友今天要学一个新本领。",
        englishPassage: "Danny and the Dinosaur Ride a Bike. Written by Bruce Hale and illustrated by Charles Grosvenor.",
        explanationZh: "ride a bike 就是“骑自行车”。故事会告诉我们，学新本领要怎样坚持。",
        repeatAfterMe: "ride a bike",
        prompt: "你会骑自行车吗？",
      },
      {
        introZh: "故事要开始了。找一找 Danny、dinosaur 和 bicycle 在哪里。",
        englishPassage: "Danny and the Dinosaur Ride a Bike. Written by Bruce Hale and illustrated by Charles Grosvenor.",
        explanationZh: "Danny 是小男孩的名字，dinosaur 是恐龙，bicycle 就是自行车。",
        repeatAfterMe: "Danny and the dinosaur",
        prompt: "你在画面中找到他们了吗？",
      },
      {
        introZh: "Danny 来博物馆看望恐龙朋友，他们发现门口有一辆巨大的自行车。",
        englishPassage: "One day, when Danny went to visit his friend the dinosaur, the two friends saw a huge bicycle in front of the museum. “Wow!” said the dinosaur. “I wonder what that's for?”",
        explanationZh: "huge bicycle 是“巨大的自行车”。I wonder what that's for 是恐龙在好奇地问：“那是做什么用的？”",
        repeatAfterMe: "I wonder what that's for?",
        prompt: "你猜这辆巨大的自行车有什么用？",
      },
      {
        introZh: "原来博物馆有一个自行车历史展。恐龙很开心，却发现 Danny 有点难过。",
        englishPassage: "“There's a new exhibit,” said Danny, “all about the history of bicycles.” “That sounds like fun,” said the dinosaur. “So why do you look sad?”",
        explanationZh: "exhibit 是“展览”。Why do you look sad 是在关心别人：“你为什么看起来不开心？”",
        repeatAfterMe: "Why do you look sad?",
        prompt: "你觉得 Danny 在担心什么？",
      },
      {
        introZh: "Danny 说了自己不开心的原因：别人都会骑车，但他还不会。",
        englishPassage: "Danny frowned. “I can't ride a bike. Betty can ride, Sofia can ride, even Zig-Zag Zack can ride. But not me,” he said.",
        explanationZh: "frowned 是“皱起眉头”。注意 can 和 can't：can 是“会”，can't 是“不会”。",
        repeatAfterMe: "I can't ride a bike.",
        prompt: "你听出 can 和 can't 的不同了吗？",
      },
      {
        introZh: "恐龙没有嘲笑 Danny，而是鼓励他开始学。",
        englishPassage: "“If they can learn, you can learn,” said the dinosaur. “I don't know,” said Danny. “Come on,” said the dinosaur. “It'll be easy. I'll help you.” They borrowed Betty's bicycle.",
        explanationZh: "If they can learn, you can learn 是一句很有力量的鼓励：“别人能学会，你也能学会。”",
        repeatAfterMe: "If they can learn, you can learn.",
        prompt: "朋友害怕学新本领时，你会怎样鼓励他？",
      },
      {
        introZh: "第一次练习要开始了。恐龙在停车场放了很多枕头，想保护 Danny。",
        englishPassage: "The dinosaur put lots of pillows around the parking lot to give Danny a soft landing. But it didn't work the way the dinosaur planned.",
        explanationZh: "soft landing 是“软软地落下”。可是 didn't work 告诉我们，这个计划没有成功。",
        repeatAfterMe: "a soft landing",
        prompt: "看看画面，这个计划出了什么问题？",
      },
      {
        introZh: "哎呀，Danny 每次摔倒时，都刚好错过了枕头。",
        englishPassage: "Each time Danny fell off, he totally missed the pillows! Ouch! “Sorry!” said the dinosaur. “Balancing is tricky,” said Danny.",
        explanationZh: "fell off 是“摔下来”，balancing 是“保持平衡”。Balancing is tricky 就是说保持平衡不容易。",
        repeatAfterMe: "Balancing is tricky.",
        prompt: "你学新本领时也有摔倒或失败过吗？",
      },
      {
        introZh: "恐龙觉得 Danny 想得太多，他想用唱歌让 Danny 放松一点。",
        englishPassage: "“You're thinking too much,” said the dinosaur. “Here, I'll distract you. Let's sing a song.” “Row, row, row your boat,” sang Danny. “Gently down the—whoa!”",
        explanationZh: "distract 是“转移注意力”。可 Danny 唱着唱着又失去了平衡，所以最后喊了 whoa。",
        repeatAfterMe: "Here, I'll distract you.",
        prompt: "唱歌这个方法成功了吗？",
      },
      {
        introZh: "Danny 又摔了一次。这次他很泄气，甚至想放弃。",
        englishPassage: "Danny tumbled off again. “This is too hard,” he said. “I should just quit.” “Nonsense,” said the dinosaur. “We'll try again tomorrow!”",
        explanationZh: "quit 是“放弃”。恐龙说 We'll try again tomorrow，意思是今天没成功，明天再试一次。",
        repeatAfterMe: "We'll try again tomorrow!",
        prompt: "遇到很难的事时，除了 quit，还可以怎样做？",
      },
      {
        introZh: "第二天，恐龙想到了一个新办法，让 Danny 在它的尾巴旁边骑。",
        englishPassage: "The next day, the dinosaur lay down in the parking lot. “Just ride along beside my tail,” he said. “That way, you can lean on me if you're about to fall.”",
        explanationZh: "beside my tail 是“在我的尾巴旁边”，lean on me 是“靠着我”。恐龙想用尾巴帮 Danny 保持平衡。",
        repeatAfterMe: "You can lean on me.",
        prompt: "你觉得恐龙的新办法会成功吗？",
      },
      {
        introZh: "Danny 又试了一次，但他没有靠住尾巴，反而从尾巴上骑了过去。",
        englishPassage: "Danny gave it a try. But instead of leaning on his friend's tail, he ran it over—yikes! And Danny fell again—ouch!",
        explanationZh: "ran it over 是“从它上面辗过去”。Yikes 表示恐龙又惊讶又疼，Ouch 表示 Danny 摔得好疼。",
        repeatAfterMe: "Yikes! Ouch!",
        prompt: "你能用不同表情说 Yikes 和 Ouch 吗？",
      },
      {
        introZh: "两个方法都失败了，Danny 觉得自己可能永远学不会。",
        englishPassage: "“This really isn't working,” said Danny. “Maybe some people just can't ride bikes.” The dinosaur didn't know what to do. How could he help his friend?",
        explanationZh: "isn't working 是“没有效果”。How could he help his friend 是恐龙在想：“他还能怎样帮助朋友？”",
        repeatAfterMe: "How could he help his friend?",
        prompt: "如果你是恐龙，你会对 Danny 说什么？",
      },
      {
        introZh: "Danny 推着自行车离开时，差点踩到一只小老鼠。他吓得一下跳到了车座上。",
        englishPassage: "When Danny walked the bike away, he almost stepped on a mouse! Danny was so surprised, he jumped into his bicycle seat. The bike rolled gently downhill, and Danny didn't fall!",
        explanationZh: "was so surprised 是“太惊讶了”，rolled gently downhill 是“轻轻地滑下坡”。Danny 忘记了害怕，反而找到了平衡。",
        repeatAfterMe: "The bike rolled gently downhill.",
        prompt: "这次 Danny 为什么没有摔倒？",
      },
      {
        introZh: "Danny 把双脚放上脚踏板，车轮转起来了。他终于骑成功了！",
        englishPassage: "Danny put his feet on the pedals. And just like that, he was riding! “I'm doing it!” he whooped. “I'm riding a bike!” The dinosaur cheered, “Yay, Danny! I knew you could do it!”",
        explanationZh: "pedals 是“脚踏板”，whooped 是“兴奋地大喊”。I'm doing it 是在开心地说：“我做到了！”",
        repeatAfterMe: "I'm doing it! I'm riding a bike!",
        prompt: "跟 Danny 一起开心地喊出这句英文吧！",
      },
      {
        introZh: "Danny 希望能和恐龙一起骑车。没想到，恐龙也在偷偷练习。",
        englishPassage: "“I wish we could ride together,” said Danny. The dinosaur smiled. “Maybe we can.” “What do you mean?” asked Danny. The dinosaur brought out the big bike from the museum. “I've been practising,” he said. “But I didn't want to tell you until you could ride too.”",
        explanationZh: "I wish we could ride together 是“我希望我们能一起骑”。I've been practising 告诉我们，恐龙也一直在练习。",
        repeatAfterMe: "I've been practising.",
        prompt: "恐龙为什么等到 Danny 学会后才告诉他？",
      },
      {
        introZh: "现在，Danny 和恐龙都准备好了。他们终于可以一起骑车出发！",
        englishPassage: "“What are we waiting for?” said Danny. “Let's ride!”",
        explanationZh: "What are we waiting for 是“我们还在等什么？”Let's ride 就是“我们骑车出发吧！”",
        repeatAfterMe: "What are we waiting for? Let's ride!",
        prompt: "这个故事让你学到了什么？",
      },
    ]),
  },
};

export function storyGuideForBook(bookSlug: string): StoryGuide | null {
  return STORY_GUIDES[bookSlug] ?? null;
}
