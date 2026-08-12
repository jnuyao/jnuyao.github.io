import type { ArtGuideSteps } from "./art-guide-types";

export const ART_STUDIO_BOOK_SLUG = "danny-dinosaur-ride-a-bike";

export const ART_STEPS = ["observe", "sketch", "create", "tell"] as const;
export type ArtStep = (typeof ART_STEPS)[number];

export const ART_MISSION_IDS = ["story-artist", "bike-designer"] as const;
export type ArtMissionId = (typeof ART_MISSION_IDS)[number];

export type ArtObservation = {
  pageIndex: number;
  label: string;
  title: string;
  focus: string;
  question: string;
  lookFor: string[];
};

export type ArtSketchPose = {
  id: string;
  label: string;
  hint: string;
  guideSrc: string;
  guideAlt: string;
  guideSteps: ArtGuideSteps;
  celebration: string;
};

export type ArtMission = {
  id: ArtMissionId;
  icon: string;
  title: string;
  subtitle: string;
  brief: string;
  guideSrc: string;
  guideAlt: string;
  guideSteps: ArtGuideSteps;
  celebration: string;
  materials: string[];
  requirements: { id: string; label: string }[];
  englishFrames: string[];
  wordBank: string[];
};

export type ArtStudioBook = {
  bookSlug: typeof ART_STUDIO_BOOK_SLUG;
  title: string;
  subtitle: string;
  observations: ArtObservation[];
  sketchPoses: ArtSketchPose[];
  missions: ArtMission[];
};

const GUIDE_ROOT = "/art-guides/danny-dinosaur-ride-a-bike";

export const RIDE_BIKE_ART_STUDIO: ArtStudioBook = {
  bookSlug: ART_STUDIO_BOOK_SLUG,
  title: "Make the Story Move!",
  subtitle: "用动作、构图和表情讲一个会动的故事",
  observations: [
    {
      pageIndex: 7,
      label: "Page 8",
      title: "A wobbly fall",
      focus: "Balance · 重心",
      question: "不用读文字，你从哪里看出 Danny 刚刚摔倒了？",
      lookFor: ["倾斜的自行车", "Danny 的身体方向", "散落一地的枕头"],
    },
    {
      pageIndex: 14,
      label: "Page 15",
      title: "He is riding!",
      focus: "Movement · 动态",
      question: "画家用了哪些线条，让自行车看起来正在前进？",
      lookFor: ["车轮里的旋转线", "弯曲的道路", "Danny 向前的姿势"],
    },
    {
      pageIndex: 15,
      label: "Page 16",
      title: "A giant surprise",
      focus: "Scale · 大小对比",
      question: "为什么恐龙、自行车和 Danny 放在一起会显得特别有趣？",
      lookFor: ["巨大和微小的对比", "前景与背景", "人物互相看的方向"],
    },
  ],
  sketchPoses: [
    {
      id: "falling",
      label: "Falling · 摔倒",
      hint: "先画倾斜的动作，再让手脚告诉我们：要摔倒了！",
      guideSrc: `${GUIDE_ROOT}/falling.png`,
      guideAlt: "Four drawing stages: action line, simple shapes, outline and colour for a child losing balance on a bicycle",
      guideSteps: [
        { title: "画一条斜线", instruction: "画一个圆头，再从头往下画一条斜线。人会顺着这条线倒下。", tip: "先轻轻画，线歪一点反而更有动作。" },
        { title: "加圆和豆子", instruction: "在线上加豆子身体、两条手臂和两条腿，再画两个车轮。", tip: "先画大形状，不用画手指和衣服。" },
        { title: "手脚张开", instruction: "让一只手还抓着车把，另一只手和一只脚向外张开。", tip: "身体越斜，摔倒的感觉越明显。" },
        { title: "发生什么了？", instruction: "加惊讶的脸、头盔、摇晃线，再画一个掉在地上的小东西。", tip: "只加两三条动作线，画面就会动起来。" },
      ],
      celebration: "哇，这个动作真的要倒下来了！",
    },
    {
      id: "balancing",
      label: "Balancing · 平衡",
      hint: "用弯弯的身体和用力的手臂，画出左右摇晃的感觉。",
      guideSrc: `${GUIDE_ROOT}/balancing.png`,
      guideAlt: "Four drawing stages: gesture line, simple shapes, outline and colour for a child balancing on a bicycle",
      guideSteps: [
        { title: "画弯弯的线", instruction: "画一个圆头，再画一条轻轻弯曲的身体线和一条横着的手臂线。", tip: "这条线像人在左右摇晃。" },
        { title: "加人和车轮", instruction: "加豆子身体、手臂、弯曲的腿，再在下面画两个车轮。", tip: "车轮可以先慢慢画两个大圆。" },
        { title: "手脚在用力", instruction: "两只手抓紧车把，双脚一高一低踩住踏板。", tip: "眉毛和嘴巴可以画出‘我在努力’。" },
        { title: "让他摇起来", instruction: "加头盔、专心的脸，再在车轮两边画短短的摇摆线。", tip: "不需要画很多背景，动作才是主角。" },
      ],
      celebration: "他还在摇，可是没有倒下！",
    },
    {
      id: "riding",
      label: "Riding · 骑行",
      hint: "身体向前、双腿踩踏，再用速度线让自行车跑起来。",
      guideSrc: `${GUIDE_ROOT}/riding.png`,
      guideAlt: "Four drawing stages: gesture line, simple shapes, outline and colour for a child riding a bicycle forward",
      guideSteps: [
        { title: "向前冲", instruction: "画一个圆头，再画一条向前弯的动作线。", tip: "身体不是直直坐着，而是轻轻向前。" },
        { title: "加两个大轮子", instruction: "沿着动作线加头、身体、手脚，下面画两个大圆车轮。", tip: "先别画辐条，两个圆已经像自行车了。" },
        { title: "抓紧、踩下去", instruction: "手抓住车把，一条腿抬起，另一条腿踩下踏板。", tip: "一高一低的腿，会让画面更有动作。" },
        { title: "让风吹起来", instruction: "加笑脸、头盔、车轮转动线和身后的速度线。", tip: "速度线要画在人物后面。" },
      ],
      celebration: "他真的骑起来了！",
    },
  ],
  missions: [
    {
      id: "story-artist",
      icon: "🎞️",
      title: "Story Artist",
      subtitle: "画一个“尝试—困难—成功”的三格故事",
      brief: "选择一项你学过的技能。不要照抄绘本，把自己的经历变成三个连续画面。",
      guideSrc: `${GUIDE_ROOT}/story-artist.png`,
      guideAlt: "Four drawing stages that build a three-panel story about a child learning to skip rope",
      guideSteps: [
        { title: "画三个格子", instruction: "把纸横过来，画三个大格子。想一想：你要画自己学会什么？", tip: "可以画骑车、跳绳、游泳，也可以画自己的想法。" },
        { title: "先放三个动作", instruction: "每格只画动作线和圆头：试一试 → 遇到困难 → 再来一次。", tip: "三个动作要不一样，故事才看得懂。" },
        { title: "加身体和表情", instruction: "把动作线变成人物。第一格认真，中间惊讶，最后自信。", tip: "先看眉毛和嘴巴，表情不用画得复杂。" },
        { title: "让故事动起来", instruction: "加动态线、少量背景和颜色，再在三格下面各写一句英语。", tip: "I try. · I try again. · I can do it!" },
      ],
      celebration: "三个画面连起来，就是一个故事！",
      materials: ["A4 或 A3 纸", "铅笔与黑色勾线笔", "彩色笔或蜡笔"],
      requirements: [
        { id: "three-poses", label: "三格里有三种明显不同的身体动作" },
        { id: "three-faces", label: "人物表情从困难变成自信" },
        { id: "movement-lines", label: "至少使用两种动态线或运动轨迹" },
        { id: "story-clues", label: "背景里有时间、地点或过程线索" },
        { id: "colour-mood", label: "颜色帮助表现情绪变化" },
      ],
      englishFrames: [
        "I try.",
        "I try again.",
        "I can do it!",
      ],
      wordBank: ["try", "fall", "again", "can", "do it"],
    },
    {
      id: "bike-designer",
      icon: "🦕",
      title: "Bike Designer",
      subtitle: "为恐龙设计一辆真正适合它的自行车",
      brief: "从恐龙的体形、长尾巴和平衡问题出发，画一张有功能标注的设计图。",
      guideSrc: `${GUIDE_ROOT}/bike-designer.png`,
      guideAlt: "Four drawing stages that build a large safe bicycle design for a friendly long-tailed dinosaur",
      guideSteps: [
        { title: "先画大轮廓", instruction: "画两个很大的圆，再用长线连成车架。给恐龙留很多空间。", tip: "圆不用一样完美，大和清楚最重要。" },
        { title: "装上自行车部件", instruction: "加长座位、高车把和大脚踏。旁边画一个小朋友来比较大小。", tip: "现在只想形状，不急着上颜色。" },
        { title: "解决尾巴问题", instruction: "把恐龙放上车。给长尾巴加支架，也可以设计第三个小轮子。", tip: "你的办法不必和示范一样，只要讲得通。" },
        { title: "安全又特别", instruction: "加头盔、刹车或车灯，再用箭头标出三个英文部件。", tip: "wheel · seat · brake" },
      ],
      celebration: "这不是普通自行车，这是你的发明！",
      materials: ["方格纸或白纸", "铅笔与直尺", "彩色笔"],
      requirements: [
        { id: "side-view", label: "画出清楚的自行车侧视图" },
        { id: "dinosaur-scale", label: "用人物或尺寸表现恐龙与车的比例" },
        { id: "tail-solution", label: "解决长尾巴和平衡的问题" },
        { id: "safety-feature", label: "加入刹车、头盔或其他安全设计" },
        { id: "english-labels", label: "至少标注五个英文部件名称" },
      ],
      englishFrames: [
        "This bike is for a dinosaur.",
        "It has ____ and ____.",
        "The ____ helps the dinosaur ____.",
      ],
      wordBank: ["wheel", "pedal", "seat", "handlebar", "brake", "helmet", "tail support"],
    },
  ],
};

export function artStudioForBook(bookSlug: string): ArtStudioBook | null {
  return bookSlug === ART_STUDIO_BOOK_SLUG ? RIDE_BIKE_ART_STUDIO : null;
}

export function artMissionById(missionId: ArtMissionId): ArtMission {
  return RIDE_BIKE_ART_STUDIO.missions.find((mission) => mission.id === missionId)
    ?? RIDE_BIKE_ART_STUDIO.missions[0];
}
