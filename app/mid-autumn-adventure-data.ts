import type { ArtGuideSteps } from "./art-guide-types";

export const MID_AUTUMN_ADVENTURE_BOOK_SLUG = "mid-autumn-festival" as const;
export const MID_AUTUMN_BOOK_SLUG = MID_AUTUMN_ADVENTURE_BOOK_SLUG;

export const MID_AUTUMN_MISSION_IDS = [
  "find-lee-ling",
  "market-roleplay",
  "dinosaur-lantern",
] as const;

export type MidAutumnMissionId = (typeof MID_AUTUMN_MISSION_IDS)[number];
export type MidAutumnAdventureStep = 0 | 1 | 2 | 3;

export type MidAutumnMission = {
  id: MidAutumnMissionId;
  icon: string;
  title: string;
  titleZh: string;
  invitation: string;
  stepLabels: readonly [string, string, string, string];
};

export const MID_AUTUMN_MISSIONS: readonly [
  MidAutumnMission,
  MidAutumnMission,
  MidAutumnMission,
] = [
  {
    id: "find-lee-ling",
    icon: "🔎",
    title: "Find Lee Ling",
    titleZh: "寻找 Lee Ling",
    invitation: "Remember the clues, follow the market and find Lee Ling.",
    stepLabels: ["Rabbit clue", "Food-stall clue", "Find Lee Ling", "Found!"],
  },
  {
    id: "market-roleplay",
    icon: "🏮",
    title: "Moonlight Market",
    titleZh: "月光夜市",
    invitation: "Use the story’s English to buy, thank, ask and answer.",
    stepLabels: ["Buy politely", "Say thank you", "Ask for help", "Tell the place"],
  },
  {
    id: "dinosaur-lantern",
    icon: "🦖",
    title: "Dinosaur Lantern",
    titleZh: "恐龙灯笼设计室",
    invitation: "Turn a favourite dinosaur into a glowing festival lantern.",
    stepLabels: ["Action line", "Big shapes", "Lantern details", "Moonlight glow"],
  },
];

export function isMidAutumnMissionId(value: string): value is MidAutumnMissionId {
  return MID_AUTUMN_MISSION_IDS.includes(value as MidAutumnMissionId);
}

export function midAutumnMissionById(missionId: MidAutumnMissionId): MidAutumnMission {
  return MID_AUTUMN_MISSIONS.find((mission) => mission.id === missionId)
    ?? MID_AUTUMN_MISSIONS[0];
}

export function isMidAutumnAdventureBook(bookSlug: string): boolean {
  return bookSlug === MID_AUTUMN_ADVENTURE_BOOK_SLUG;
}

export type MidAutumnHotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PercentageHotspot = MidAutumnHotspot;

export type FindLeeLingScene = {
  id: "rabbit-lantern" | "dim-sum-stall" | "lee-ling";
  step: 0 | 1 | 2;
  pageIndex: number;
  imageSrc: string;
  hotspot: PercentageHotspot;
  prompt: string;
  promptZh: string;
  clue: string;
  clueZh: string;
  successLine: string;
  successLineZh: string;
};

const PAGE_ROOT = "/pages/mid-autumn-festival";

export const FIND_LEE_LING_SCENES: readonly [
  FindLeeLingScene,
  FindLeeLingScene,
  FindLeeLingScene,
] = [
  {
    id: "rabbit-lantern",
    step: 0,
    pageIndex: 2,
    imageSrc: `${PAGE_ROOT}/03.webp`,
    hotspot: { x: 13.5, y: 58.5, width: 9.5, height: 20 },
    prompt: "Remember the clue. Tap Lee Ling’s rabbit lantern.",
    promptZh: "记住第一个线索：点一点 Lee Ling 的兔子灯笼。",
    clue: "Look near Lee Ling’s hand for two long yellow ears.",
    clueZh: "看看 Lee Ling 的手边，寻找两只长长的黄色耳朵。",
    successLine: "Lee Ling has a rabbit lantern.",
    successLineZh: "找到了：Lee Ling 拿着一盏兔子灯笼。",
  },
  {
    id: "dim-sum-stall",
    step: 1,
    pageIndex: 5,
    imageSrc: `${PAGE_ROOT}/06.webp`,
    hotspot: { x: 79, y: 19.5, width: 20, height: 18.5 },
    prompt: "Follow the food clue. Find the DIM SUM stall.",
    promptZh: "跟着食物线索，找到写着 DIM SUM 的摊位。",
    clue: "Look high on the right-hand page for a large red sign.",
    clueZh: "看看右页的上方，那里有一块很大的红色招牌。",
    successLine: "Dad walks past the food stalls.",
    successLineZh: "找到了：爸爸正走过食物摊位。",
  },
  {
    id: "lee-ling",
    step: 2,
    pageIndex: 7,
    imageSrc: `${PAGE_ROOT}/08.webp`,
    hotspot: { x: 20.5, y: 37, width: 14.5, height: 36.5 },
    prompt: "Where is Lee Ling? Tap her behind the stall.",
    promptZh: "Lee Ling 在哪里？点一点躲在摊位后面的她。",
    clue: "Look behind the counter, near the egg tarts.",
    clueZh: "看看柜台后面、蛋挞旁边。",
    successLine: "You found her! Lee Ling is behind the stall.",
    successLineZh: "找到她了！Lee Ling 在摊位后面。",
  },
];

export const FIND_LEE_LING_CELEBRATION = {
  step: 3 as const,
  title: "Case solved!",
  titleZh: "寻人任务完成！",
  line: "You found her! Lee Ling is behind the stall.",
  lineZh: "你根据灯笼和摊位线索找到了 Lee Ling。",
  storyTwist: "Lee Ling says, “Daddy got lost but I found him again!”",
  storyTwistZh: "故事最后换了一个角度：Lee Ling 觉得是爸爸走丢了，而她找回了爸爸。",
};

export type MarketRoleplayStep = {
  step: MidAutumnAdventureStep;
  speaker: "shopper" | "seller" | "helper";
  title: string;
  titleZh: string;
  instruction: string;
  instructionZh: string;
  modelLine: string;
  storyAnchor: string;
};

export const MARKET_ITEMS = [
  { id: "tiger-lantern", label: "tiger lantern", labelZh: "老虎灯笼", icon: "🐯" },
  { id: "rabbit-lantern", label: "rabbit lantern", labelZh: "兔子灯笼", icon: "🐇" },
  { id: "mooncake", label: "mooncake", labelZh: "月饼", icon: "🥮" },
  { id: "dinosaur-lantern", label: "dinosaur lantern", labelZh: "恐龙灯笼", icon: "🦖" },
] as const;

export type MarketItemId = (typeof MARKET_ITEMS)[number]["id"];

export const MARKET_ROLEPLAY_STEPS: readonly [
  MarketRoleplayStep,
  MarketRoleplayStep,
  MarketRoleplayStep,
  MarketRoleplayStep,
] = [
  {
    step: 0,
    speaker: "shopper",
    title: "Buy politely",
    titleZh: "有礼貌地购买",
    instruction: "Choose one thing, then ask for it in a gentle voice.",
    instructionZh: "先选一样东西，再用温和、有礼貌的声音开口。",
    modelLine: "Please, may I have that tiger lantern?",
    storyAnchor: "“Please, Dad, may I have that tiger lantern?”",
  },
  {
    step: 1,
    speaker: "shopper",
    title: "Thank the seller",
    titleZh: "向摊主道谢",
    instruction: "Look at the seller and say the short line clearly.",
    instructionZh: "看着摊主，把这句简短的英语说清楚。",
    modelLine: "Thank you!",
    storyAnchor: "We said, “Thank you!”",
  },
  {
    step: 2,
    speaker: "shopper",
    title: "Ask for help",
    titleZh: "开口寻找线索",
    instruction: "Ask the food-stall helper the whole question.",
    instructionZh: "向食物摊位的阿姨完整地问出这个问题。",
    modelLine: "Have you seen a little girl with a rabbit lantern?",
    storyAnchor: "Dad asked, “Have you seen a little girl with a rabbit lantern?”",
  },
  {
    step: 3,
    speaker: "helper",
    title: "Tell the place",
    titleZh: "说出她的位置",
    instruction: "Answer with a full sentence. Stress the word “behind”.",
    instructionZh: "用完整句回答，并把 behind 说清楚。",
    modelLine: "She is behind the stall.",
    storyAnchor: "Behind the stall was Lee Ling.",
  },
];

export function marketItemById(itemId: MarketItemId) {
  return MARKET_ITEMS.find((item) => item.id === itemId) ?? MARKET_ITEMS[0];
}

export function marketRequestForItem(itemId: MarketItemId): string {
  return `Please, may I have that ${marketItemById(itemId).label}?`;
}

export const MID_AUTUMN_LANTERN_IDS = [
  "spinosaurus",
  "tyrannosaurus",
  "triceratops",
] as const;

export type MidAutumnLanternId = (typeof MID_AUTUMN_LANTERN_IDS)[number];

export type MidAutumnLanternDesign = {
  id: MidAutumnLanternId;
  name: string;
  nameZh: string;
  icon: string;
  colour: string;
  guideSrc: string;
  guideAlt: string;
  guideSteps: ArtGuideSteps;
  featureWords: readonly string[];
  outputFrame: string;
  outputFrameZh: string;
  exampleOutput: string;
  featureFrame: string;
  celebration: string;
};

export type DinosaurLanternDesign = MidAutumnLanternDesign;

const LANTERN_GUIDE_ROOT = "/art-guides/mid-autumn-festival";

export const MID_AUTUMN_LANTERN_DESIGNS: readonly [
  MidAutumnLanternDesign,
  MidAutumnLanternDesign,
  MidAutumnLanternDesign,
] = [
  {
    id: "spinosaurus",
    name: "Spinosaurus",
    nameZh: "棘龙",
    icon: "🌊",
    colour: "#3b8f96",
    guideSrc: `${LANTERN_GUIDE_ROOT}/spinosaurus-lantern.png`,
    guideAlt: "Four progressive stages for designing a glowing Spinosaurus paper lantern",
    guideSteps: [
      {
        title: "画出长长的动作线",
        instruction: "从细长的嘴画到宽尾巴，让身体低低地横在纸上。",
        tip: "先画大方向，不急着加牙齿和花纹。",
      },
      {
        title: "搭好身体和背帆",
        instruction: "放上头、胸腹和四肢，再让背帆从低到高、又慢慢变低。",
        tip: "宽尾巴和高背帆会让它一眼就像棘龙。",
      },
      {
        title: "变成纸灯笼",
        instruction: "把身体分成几块透光纸面，加一根提灯用的弧形手柄。",
        tip: "结构线可以保留，它们正好像灯笼的骨架。",
      },
      {
        title: "点亮中秋夜",
        instruction: "中间涂暖黄，边缘用深蓝和紫色衬托，再画月亮和夜市。",
        tip: "灯笼里只画安全的 LED 小灯，不画明火。",
      },
    ],
    featureWords: ["tall sail", "long snout", "broad tail"],
    outputFrame: "My Spinosaurus lantern glows ____.",
    outputFrameZh: "我的棘龙灯笼发出____色的光。",
    exampleOutput: "My Spinosaurus lantern glows red.",
    featureFrame: "It has a tall sail.",
    celebration: "你的棘龙灯笼已经点亮中秋夜！",
  },
  {
    id: "tyrannosaurus",
    name: "T. rex",
    nameZh: "霸王龙",
    icon: "🦖",
    colour: "#b85f3f",
    guideSrc: `${LANTERN_GUIDE_ROOT}/tyrannosaurus-lantern.png`,
    guideAlt: "Four progressive stages for designing a glowing Tyrannosaurus rex paper lantern",
    guideSteps: [
      {
        title: "画出平衡的动作线",
        instruction: "从大头一路画到长尾巴，让头和尾巴分别伸向两边。",
        tip: "身体要横着，尾巴不要拖在地上。",
      },
      {
        title: "搭好大头和强腿",
        instruction: "加大头、厚胸腹、两条强壮后腿和两只很小的前臂。",
        tip: "每只小手只画两根主要手指。",
      },
      {
        title: "变成纸灯笼",
        instruction: "用清楚的边框把头、身体和尾巴连成灯架，再加提灯手柄。",
        tip: "牙齿可以简化成几组小三角，不要挡住透光纸面。",
      },
      {
        title: "点亮中秋夜",
        instruction: "让肚子里透出橙黄色光，再加深蓝夜空和一个圆圆的月亮。",
        tip: "灯笼里只画安全的 LED 小灯，不画明火。",
      },
    ],
    featureWords: ["big head", "strong legs", "long tail"],
    outputFrame: "My T. rex lantern glows ____.",
    outputFrameZh: "我的霸王龙灯笼发出____色的光。",
    exampleOutput: "My T. rex lantern glows orange.",
    featureFrame: "It has strong legs.",
    celebration: "大头和长尾巴平衡住了，霸王龙灯笼亮起来了！",
  },
  {
    id: "triceratops",
    name: "Triceratops",
    nameZh: "三角龙",
    icon: "🛡️",
    colour: "#b7833d",
    guideSrc: `${LANTERN_GUIDE_ROOT}/triceratops-lantern.png`,
    guideAlt: "Four progressive stages for designing a glowing Triceratops paper lantern",
    guideSteps: [
      {
        title: "画出低低的轮廓",
        instruction: "画一条贴近地面的背线，前面留出很大的头和颈盾。",
        tip: "想象它像一辆稳稳站住的重型车。",
      },
      {
        title: "搭好四条腿和三只角",
        instruction: "加厚身体、四条短壮的腿、两只长眉角和一只短鼻角。",
        tip: "数一数：两长一短，正好三只角。",
      },
      {
        title: "变成纸灯笼",
        instruction: "把颈盾分成漂亮的透光色块，再给身体加灯架线和手柄。",
        tip: "花纹可以左右平衡，也可以由你创造新的规律。",
      },
      {
        title: "点亮中秋夜",
        instruction: "让颈盾和肚子发出暖光，再画地面阴影、月亮和小灯笼。",
        tip: "灯笼里只画安全的 LED 小灯，不画明火。",
      },
    ],
    featureWords: ["three horns", "large frill", "strong legs"],
    outputFrame: "My Triceratops lantern glows ____.",
    outputFrameZh: "我的三角龙灯笼发出____色的光。",
    exampleOutput: "My Triceratops lantern glows yellow.",
    featureFrame: "It has three horns.",
    celebration: "三角龙灯笼站得又稳又亮！",
  },
];

export const DINOSAUR_LANTERN_DESIGNS = MID_AUTUMN_LANTERN_DESIGNS;

export function isMidAutumnLanternId(value: string): value is MidAutumnLanternId {
  return MID_AUTUMN_LANTERN_IDS.includes(value as MidAutumnLanternId);
}

export function midAutumnLanternById(lanternId: MidAutumnLanternId): MidAutumnLanternDesign {
  return MID_AUTUMN_LANTERN_DESIGNS.find((design) => design.id === lanternId)
    ?? MID_AUTUMN_LANTERN_DESIGNS[0];
}

export const MID_AUTUMN_STORY_EXTRAS = [
  {
    id: "singapore-traditions",
    icon: "🏮",
    label: "Story extra · 文化小发现",
    title: "A festival for sharing",
    text: "In Singapore, families may enjoy mooncakes and tea, while children carry lanterns during Mid-Autumn Festival.",
    textZh: "在新加坡，人们会用赏月、分享月饼和茶、提灯笼等方式度过中秋节。",
  },
  {
    id: "moonlight",
    icon: "🌕",
    label: "Story extra · 月亮小科学",
    title: "Where does moonlight come from?",
    text: "The Moon does not make its own light. Moonlight is sunlight reflected from the Moon.",
    textZh: "月亮自己不会发光；我们看见的月光，是月球反射的太阳光。",
  },
  {
    id: "story-viewpoint",
    icon: "👀",
    label: "Story extra · 故事小侦探",
    title: "One event, two viewpoints",
    text: "Dad thinks Lee Ling got lost. Lee Ling thinks Daddy got lost. The same event can look different to different people.",
    textZh: "爸爸觉得 Lee Ling 走丢了；Lee Ling 却觉得爸爸走丢了。同一件事，从不同人物眼里看会不一样。",
  },
] as const;

export const MID_AUTUMN_DISCOVERIES = MID_AUTUMN_STORY_EXTRAS;
