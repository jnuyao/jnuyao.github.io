import type { ArtGuideSteps } from "./art-guide-types";

export const DINOSAUR_ART_LESSON_IDS = [
  "spinosaurus",
  "tyrannosaurus",
  "triceratops",
  "brachiosaurus",
  "ankylosaurus",
  "velociraptor",
] as const;

export type DinosaurArtLessonId = (typeof DINOSAUR_ART_LESSON_IDS)[number];
export type DinosaurArtStep = 0 | 1 | 2 | 3;

export type DinosaurWord = {
  word: string;
  zh: string;
};

export type DinosaurArtLesson = {
  id: DinosaurArtLessonId;
  name: string;
  nameZh: string;
  icon: string;
  colour: string;
  skill: string;
  fact: string;
  scienceNote?: string;
  guideSrc: string;
  guideAlt: string;
  guideSteps: ArtGuideSteps;
  celebration: string;
  vocabulary: readonly DinosaurWord[];
  sentence: string;
  challenge: string;
  materials: readonly string[];
  relatedBookSlugs: readonly string[];
};

const GUIDE_ROOT = "/art-guides/dinosaur-art-lab";

export const DINOSAUR_ART_BOOK_SLUGS = [
  "dinosaur-school",
  "danny-dinosaur-goes-to-camp",
  "danny-dinosaur-school-days",
  "danny-dinosaur-too-tall",
  "danny-dinosaur-sand-castle-contest",
  "danny-dinosaur-new-puppy",
  "danny-dinosaur-mind-manners",
  "danny-dinosaur-ride-a-bike",
] as const;

const RELATED_DINOSAUR_BOOKS: readonly string[] = DINOSAUR_ART_BOOK_SLUGS;

export const DINOSAUR_ART_LESSONS: readonly DinosaurArtLesson[] = [
  {
    id: "spinosaurus",
    name: "Spinosaurus",
    nameZh: "棘龙",
    icon: "🌊",
    colour: "#3c8c91",
    skill: "背帆、长嘴与水面",
    fact: "棘龙有细长的嘴、很高的背帆和宽大的尾巴，可能常在水边活动。",
    scienceNote: "棘龙怎样在陆地上行走、怎样在水中活动，科学家仍在继续研究。",
    guideSrc: `${GUIDE_ROOT}/spinosaurus.png`,
    guideAlt: "Four progressive drawing stages for a Spinosaurus wading through shallow water",
    guideSteps: [
      { title: "定方向", instruction: "从长嘴到尾巴画一条弯弯的动作线，再放上肩和臀部两个圆。", tip: "先决定它往哪里走，不急着画牙齿。" },
      { title: "搭身体", instruction: "沿着线加细长的头、胸腹、四肢和越来越宽的尾巴。", tip: "身体要长，后腿不要画得像霸王龙那么高。" },
      { title: "画出棘龙", instruction: "加细长嘴、圆锥形牙齿和高低有节奏的背帆。", tip: "背帆不是一个半圆，要看见一根根长短不同的支撑线。" },
      { title: "走进水里", instruction: "加水线、倒影和小鱼，让腿有一部分藏进水里。", tip: "你可以自己决定水有多深。" },
    ],
    celebration: "你的棘龙真的走进水里了！",
    vocabulary: [{ word: "sail", zh: "背帆" }, { word: "snout", zh: "长嘴" }, { word: "tail", zh: "尾巴" }, { word: "water", zh: "水" }],
    sentence: "It has a tall sail.",
    challenge: "把棘龙改成捕鱼、游泳或从水里抬头的动作。",
    materials: ["横放的白纸", "铅笔", "黑色勾线笔", "彩色笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
  {
    id: "tyrannosaurus",
    name: "T. rex",
    nameZh: "霸王龙",
    icon: "🦖",
    colour: "#b8683d",
    skill: "大头、强腿与尾巴平衡",
    fact: "霸王龙用两条强壮的后腿行走，长尾巴帮助巨大的头和身体保持平衡。",
    guideSrc: `${GUIDE_ROOT}/tyrannosaurus.png`,
    guideAlt: "Four progressive drawing stages for a walking Tyrannosaurus rex balanced by its tail",
    guideSteps: [
      { title: "画平衡线", instruction: "从鼻尖到尾巴画一条长线，再标出大头、胸口和臀部。", tip: "头在前面很重，尾巴要向后伸。" },
      { title: "放大形体", instruction: "前面加大头，中间加胸腹，下面放两条粗壮的后腿。", tip: "先画体块，不要先数牙齿。" },
      { title: "找到比例", instruction: "加很小的前臂、大脚掌和慢慢变细的尾巴。", tip: "霸王龙每只手只有两根主要手指。" },
      { title: "让它走动", instruction: "抬起一条腿，加脚印和一点尘土；尾巴不要拖在地上。", tip: "身体保持横向，它会显得更有力量。" },
    ],
    celebration: "大头和长尾巴平衡住了！",
    vocabulary: [{ word: "head", zh: "头" }, { word: "teeth", zh: "牙齿" }, { word: "legs", zh: "腿" }, { word: "tail", zh: "尾巴" }],
    sentence: "It has strong legs.",
    challenge: "画一只正在慢慢靠近、回头或低头闻脚印的霸王龙。",
    materials: ["横放的白纸", "铅笔", "橡皮", "棕色或绿色画笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
  {
    id: "triceratops",
    name: "Triceratops",
    nameZh: "三角龙",
    icon: "🛡️",
    colour: "#b98542",
    skill: "三只角、颈盾与重量",
    fact: "三角龙有鹦鹉嘴一样的喙、大颈盾、两只眉角和一只较短的鼻角。",
    guideSrc: `${GUIDE_ROOT}/triceratops.png`,
    guideAlt: "Four progressive drawing stages for a heavy grounded Triceratops stepping forward",
    guideSteps: [
      { title: "压低身体", instruction: "画一条低低的背线，前面留一个很大的头盾圆。", tip: "三角龙像一辆贴近地面的重型车。" },
      { title: "搭稳身体", instruction: "加厚身体、短脖子和四条稳稳站住的腿。", tip: "脚要落在身体下面，它才不会像要摔倒。" },
      { title: "画出三只角", instruction: "先画大颈盾，再加两只长眉角和一只短鼻角。", tip: "数一数：两长一短，正好三只。" },
      { title: "表现重量", instruction: "让一只前脚向前，加草地、石头和深一点的地面阴影。", tip: "靠近脚的阴影最深，会显得身体很重。" },
    ],
    celebration: "这只三角龙站得又稳又有力量！",
    vocabulary: [{ word: "horn", zh: "角" }, { word: "frill", zh: "颈盾" }, { word: "beak", zh: "喙" }, { word: "legs", zh: "腿" }],
    sentence: "It has three horns.",
    challenge: "改变头的方向，让三角龙低头防守或抬头观察。",
    materials: ["横放的白纸", "铅笔", "黑色笔", "土黄色画笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
  {
    id: "brachiosaurus",
    name: "Brachiosaurus",
    nameZh: "腕龙",
    icon: "🌳",
    colour: "#688c4b",
    skill: "长颈、高肩与大小对比",
    fact: "腕龙的前腿比后腿长，肩膀很高，长颈可以伸向高处。",
    guideSrc: `${GUIDE_ROOT}/brachiosaurus.png`,
    guideAlt: "Four progressive drawing stages for a tall Brachiosaurus reaching a tree canopy",
    guideSteps: [
      { title: "画长颈线", instruction: "从脚边往上画一条长长的弯线，再转回大身体。", tip: "先让脖子占满纸的高度。" },
      { title: "放大身体", instruction: "加小头、大胸腹和四条柱子一样的腿。", tip: "前腿要比后腿长一点，肩膀才会高。" },
      { title: "接好结构", instruction: "把脖子接宽，让尾巴慢慢变细，四只脚稳稳踩地。", tip: "鼻孔画在嘴巴前方，不要画到头顶。" },
      { title: "画出高度", instruction: "加树顶，再在脚边画一个很小的人或灌木比较大小。", tip: "一大一小放在一起，大家马上看懂它有多高。" },
    ],
    celebration: "你的腕龙已经碰到树顶了！",
    vocabulary: [{ word: "neck", zh: "脖子" }, { word: "tall", zh: "高" }, { word: "tree", zh: "树" }, { word: "small", zh: "小" }],
    sentence: "It has a long neck.",
    challenge: "把纸竖过来，画一只抬头、低头喝水或两只互相看的腕龙。",
    materials: ["可以竖放的白纸", "铅笔", "绿色画笔", "棕色画笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
  {
    id: "ankylosaurus",
    name: "Ankylosaurus",
    nameZh: "甲龙",
    icon: "🪨",
    colour: "#6f7751",
    skill: "低轮廓、甲片与尾槌质感",
    fact: "甲龙身体低而宽，背上有骨质甲片，尾巴末端有粗大的尾槌。",
    guideSrc: `${GUIDE_ROOT}/ankylosaurus.png`,
    guideAlt: "Four progressive drawing stages for a low armoured Ankylosaurus with a tail club",
    guideSteps: [
      { title: "画低轮廓", instruction: "画一个贴近地面的长椭圆，像一座低低的小山。", tip: "甲龙不需要画得很高。" },
      { title: "加短腿和尾巴", instruction: "加小头、四条短腿、宽尾巴和末端的大尾槌。", tip: "尾槌要和尾巴连在一起，不是飘着的石头。" },
      { title: "排列甲片", instruction: "背上先放几块大甲片，再把小甲片排在空隙里。", tip: "不要画成一样大的整齐圆点。" },
      { title: "画出厚度", instruction: "向光的一边画亮，另一边加阴影，让甲片鼓起来。", tip: "你可以给每块甲片设计不同纹理。" },
    ],
    celebration: "这身盔甲看起来又厚又坚固！",
    vocabulary: [{ word: "armour", zh: "盔甲" }, { word: "club", zh: "尾槌" }, { word: "low", zh: "低" }, { word: "strong", zh: "坚固" }],
    sentence: "It has hard armour.",
    challenge: "设计自己的甲片花纹，再画尾槌向左或向右挥动。",
    materials: ["横放的白纸", "铅笔", "灰色画笔", "一支深色笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    nameZh: "伶盗龙",
    icon: "🪶",
    colour: "#8d5c68",
    skill: "羽毛、弯爪与奔跑动态",
    fact: "真实的伶盗龙体形轻巧，长着羽毛，脚上有一根抬起的弯爪。",
    guideSrc: `${GUIDE_ROOT}/velociraptor.png`,
    guideAlt: "Four progressive drawing stages for a feathered Velociraptor running quickly",
    guideSteps: [
      { title: "画冲刺线", instruction: "画一条向前冲的 S 形动作线，再标出头和臀部。", tip: "前面留出空间，它才有地方跑。" },
      { title: "搭轻身体", instruction: "加小头、轻身体、弯曲的后腿和笔直向后的长尾巴。", tip: "身体不要画成霸王龙那么厚重。" },
      { title: "找到特别结构", instruction: "给手臂和身体加羽毛，再画出脚上抬起的弯爪。", tip: "前臂像小翅膀，但不是用来飞的。" },
      { title: "让它跑起来", instruction: "在后面加速度线和脚印，尾巴保持平直来帮助平衡。", tip: "羽毛颜色可以完全由你设计。" },
    ],
    celebration: "这只长羽毛的伶盗龙跑起来了！",
    vocabulary: [{ word: "feather", zh: "羽毛" }, { word: "claw", zh: "爪" }, { word: "run", zh: "跑" }, { word: "fast", zh: "快" }],
    sentence: "It can run fast.",
    challenge: "画两只伶盗龙一前一后奔跑，或者画它突然停下来观察。",
    materials: ["横放的白纸", "铅笔", "黑色细笔", "两三种彩色笔"],
    relatedBookSlugs: RELATED_DINOSAUR_BOOKS,
  },
] as const;

export function dinosaurArtLessonById(lessonId: DinosaurArtLessonId): DinosaurArtLesson {
  return DINOSAUR_ART_LESSONS.find((lesson) => lesson.id === lessonId) ?? DINOSAUR_ART_LESSONS[0];
}

export function isDinosaurArtBook(bookSlug: string): boolean {
  return DINOSAUR_ART_BOOK_SLUGS.includes(bookSlug as (typeof DINOSAUR_ART_BOOK_SLUGS)[number]);
}

export function dinosaurArtLessonsForBook(bookSlug: string): readonly DinosaurArtLesson[] {
  return isDinosaurArtBook(bookSlug) ? DINOSAUR_ART_LESSONS : [];
}
