import type {
  EverydayDiscoveryImageCredit,
  EverydayDiscoveryItem,
  EverydayDiscoveryScene,
} from "./everyday-discovery-data";

export const HOME_SCHOOL_PLAY_SCENE_IDS = ["chores", "school", "playground"] as const;
export const HOME_SCHOOL_PLAY_IDS = [
  "sweep", "mop", "laundry", "dishes", "tidy", "vacuum", "recycle", "dusting",
  "backpack", "classroom", "notebook", "ruler", "scissors", "library", "timetable", "homework",
  "swing", "slide", "seesaw", "sandbox", "climbing-frame", "monkey-bars", "hopscotch", "balance",
] as const;

export type HomeSchoolPlaySceneId = (typeof HOME_SCHOOL_PLAY_SCENE_IDS)[number];
export type HomeSchoolPlayId = (typeof HOME_SCHOOL_PLAY_IDS)[number];

export type HomeSchoolPlayItem = Omit<EverydayDiscoveryItem, "id" | "sceneId"> & {
  id: HomeSchoolPlayId;
  sceneId: HomeSchoolPlaySceneId;
  guide: string;
  guideZh: string;
};

export type HomeSchoolPlayScene = Omit<EverydayDiscoveryScene, "id" | "itemIds"> & {
  id: HomeSchoolPlaySceneId;
  itemIds: readonly HomeSchoolPlayId[];
};

export const HOME_SCHOOL_PLAY_IMAGE_CREDITS = {
  sweep: { author: "Go-tea 郭天", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/131814204@N04/48581792842", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  mop: { author: "peretzp", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/68877611@N00/3915231938", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  laundry: { author: "aqua.mech", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/137169575@N04/24978874031", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  dishes: { author: "aesop", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/99861378@N00/3823600063", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  tidy: { author: "alljengi", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/27718315@N02/9470127199", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  vacuum: { author: "ebrunar", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/90943367@N00/3397609911", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  recycle: { author: "Dano", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/36101697408@N01/441228222", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  dusting: { author: "Tami24", license: "Public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Feather_duster.jpg", licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Public_domain", adaptation: "resized over a blurred crop" },
  backpack: { author: "Gamingforfun365", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:School_bag_backpack.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", adaptation: "resized over a blurred crop" },
  classroom: { author: "Dobrislava", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Empty_classroom_2020.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", adaptation: "resized over a blurred crop" },
  notebook: { author: "emmamccleary", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/98603452@N00/5403942852", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  ruler: { author: "B/Hiking Nikon Oregon", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/67395061@N00/2606645766", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  scissors: { author: "jacqui.brown33", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/120600995@N07/13420171175", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  library: { author: "jblyberg", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/36813960@N00/2057158087", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  timetable: { author: "ttf is paranoid", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/42359364@N00/5435354746", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  homework: { author: "GoodNCrazy", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/40215657@N03/5376076281", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  swing: { author: "srwsrwuk", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/95101869@N00/6856985325", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  slide: { author: "jonolist", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/46635911@N00/143997346", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  seesaw: { author: "ell brown", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/39415781@N06/6818049583", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  sandbox: { author: "edenpictures", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/10485077@N06/4516108755", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  "climbing-frame": { author: "ell brown", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/39415781@N06/4692909253", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  "monkey-bars": { author: "ell brown", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/39415781@N06/32228073880", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
  hopscotch: { author: "Jan Tik", license: "CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/15363357@N00/271986658", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  balance: { author: "oddharmonic", license: "CC BY-SA 2.0", sourceUrl: "https://www.flickr.com/photos/42528087@N00/3424574081", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", adaptation: "resized over a blurred crop" },
} as const satisfies Record<HomeSchoolPlayId, EverydayDiscoveryImageCredit>;

const IMAGE_ROOT = "/everyday-discovery";
const AUDIO_ROOT = "/everyday-discovery-audio";

function item(
  definition: Omit<HomeSchoolPlayItem, "imageSrc" | "wordAudioSrc" | "coachAudioSrc" | "descriptionAudioSrc" | "imageCredit" | "coachScript"> & { coachScript?: string },
): HomeSchoolPlayItem {
  const chunkCues = definition.chunks.map((chunk) => chunk.cue).join(". ");
  const audioRoot = `${AUDIO_ROOT}/${definition.sceneId}/${definition.id}`;
  return {
    ...definition,
    imageSrc: `${IMAGE_ROOT}/${definition.sceneId}/${definition.id}.jpg`,
    imageCredit: HOME_SCHOOL_PLAY_IMAGE_CREDITS[definition.id],
    coachScript: definition.coachScript ?? `Listen, then say each part: ${chunkCues}. Now blend it: ${definition.pronunciation}. ${definition.word}.`,
    wordAudioSrc: `${audioRoot}/whole.mp3`,
    coachAudioSrc: `${audioRoot}/coach.mp3`,
    descriptionAudioSrc: `${audioRoot}/description.mp3`,
  };
}

export const HOME_SCHOOL_PLAY_SCENES: readonly HomeSchoolPlayScene[] = [
  {
    id: "chores", title: "Helping Hands", titleZh: "家务小帮手", icon: "🧹", accent: "#b96f43", eyebrow: "Clean · Sort · Care",
    description: "Use action words while helping to care for a home.", descriptionZh: "一边帮忙照顾家，一边学会实用的动作词。",
    itemIds: ["sweep", "mop", "laundry", "dishes", "tidy", "vacuum", "recycle", "dusting"],
    challenge: {
      prompt: "The floor has crumbs. Which tool should we use first?", promptZh: "地板上有碎屑。我们先用什么工具？",
      options: [
        { id: "broom", label: "A broom", labelZh: "扫把", icon: "🧹" },
        { id: "pillow", label: "A pillow", labelZh: "枕头", icon: "🛏️" },
        { id: "ruler", label: "A ruler", labelZh: "尺子", icon: "📏" },
      ], answerId: "broom", success: "Yes! Sweep the crumbs into a small pile.", successZh: "对了！把碎屑扫成一小堆。",
    },
  },
  {
    id: "school", title: "School Day", titleZh: "学校一天", icon: "🎒", accent: "#4f78b8", eyebrow: "Pack · Learn · Create",
    description: "Name the places and tools that help us learn at school.", descriptionZh: "认识学校里帮助我们学习的地方和工具。",
    itemIds: ["backpack", "classroom", "notebook", "ruler", "scissors", "library", "timetable", "homework"],
    challenge: {
      prompt: "Which tool helps us measure a straight line?", promptZh: "哪个工具能帮我们测量直线？",
      options: [
        { id: "ruler", label: "A ruler", labelZh: "尺子", icon: "📏" },
        { id: "backpack", label: "A backpack", labelZh: "书包", icon: "🎒" },
        { id: "notebook", label: "A notebook", labelZh: "笔记本", icon: "📓" },
      ], answerId: "ruler", success: "Correct! Start at zero and read the mark at the end.", successZh: "正确！从 0 开始，看物体末端对着哪个刻度。",
    },
  },
  {
    id: "playground", title: "Playground Moves", titleZh: "游乐场动起来", icon: "🛝", accent: "#7b5aa6", eyebrow: "Climb · Jump · Balance",
    description: "Learn playground words while noticing how bodies and simple machines move.", descriptionZh: "一边学游乐场词汇，一边观察身体和简单机械怎样运动。",
    itemIds: ["swing", "slide", "seesaw", "sandbox", "climbing-frame", "monkey-bars", "hopscotch", "balance"],
    challenge: {
      prompt: "Which playground toy moves up and down around a middle point?", promptZh: "哪个游乐设施会绕着中间的点一上一下？",
      options: [
        { id: "seesaw", label: "A seesaw", labelZh: "跷跷板", icon: "⚖️" },
        { id: "sandbox", label: "A sandbox", labelZh: "沙坑", icon: "🪣" },
        { id: "slide", label: "A slide", labelZh: "滑梯", icon: "🛝" },
      ], answerId: "seesaw", success: "Exactly! The middle support is the pivot.", successZh: "没错！中间的支点叫 pivot。",
    },
  },
] as const;

export const HOME_SCHOOL_PLAY_ITEMS: readonly HomeSchoolPlayItem[] = [
  item({
    id: "sweep", sceneId: "chores", word: "sweep", wordZh: "扫；清扫",
    chunks: [{ id: "sweep", text: "sweep", cue: "SWEEP", stressed: true }], pronunciation: "SWEEP", ipa: "/swiːp/",
    description: ["We sweep loose dirt with a broom.", "Push the broom across the floor.", "Make a small pile, then use a dustpan."],
    descriptionZh: ["我们用扫把清扫松散的灰尘和碎屑。", "把扫把沿着地板向前推。", "把碎屑扫成一小堆，再用簸箕收起来。"],
    descriptionKeywords: [{ word: "loose dirt", zh: "松散的灰尘" }, { word: "broom", zh: "扫把" }, { word: "dustpan", zh: "簸箕" }],
    guide: "Trace a wide S in the air as you say sweep.", guideZh: "边说 sweep，边在空中画一个大 S。",
    discovery: "A broom moves crumbs and dust without using electricity.", discoveryZh: "扫把不用电，也能把碎屑和灰尘移走。",
    soundTip: "Hold the long ee, then close your lips for p.", soundTipZh: "把 ee 拉长一点，最后闭唇说 p。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/sweep",
  }),
  item({
    id: "mop", sceneId: "chores", word: "mop", wordZh: "拖地；拖把",
    chunks: [{ id: "mop", text: "mop", cue: "MOP", stressed: true }], pronunciation: "MOP", ipa: "/mɑːp/",
    description: ["We use a mop on a hard floor.", "A damp mop picks up sticky marks.", "Wring the mop so the floor is not too wet."],
    descriptionZh: ["我们用拖把清洁硬质地板。", "潮湿的拖把能清掉黏住的污渍。", "把拖把拧干一些，地板就不会太湿。"],
    descriptionKeywords: [{ word: "hard floor", zh: "硬质地板" }, { word: "damp", zh: "潮湿的" }, { word: "wring", zh: "拧干" }],
    guide: "Pretend to push a mop forward and pull it back.", guideZh: "假装握住拖把，向前推、向后拉。",
    discovery: "Too much water can make a floor slippery.", discoveryZh: "地板上水太多会变得很滑。",
    soundTip: "Open wide for the short o, then finish with p.", soundTipZh: "嘴巴张开说短 o，最后轻轻闭唇说 p。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/mop",
  }),
  item({
    id: "laundry", sceneId: "chores", word: "laundry", wordZh: "待洗或已洗的衣物",
    chunks: [{ id: "laun", text: "laun", cue: "LAWN", stressed: true }, { id: "dry", text: "dry", cue: "dree", stressed: false }], pronunciation: "LAWN · dree", ipa: "/ˈlɔːn.dri/",
    description: ["Laundry means clothes that need washing.", "Sort light and dark clothes before a wash.", "Dry clothes before you fold them."],
    descriptionZh: ["laundry 指需要清洗的衣物。", "洗衣前把浅色和深色衣物分开。", "衣物晾干后再折叠。"],
    descriptionKeywords: [{ word: "washing", zh: "清洗" }, { word: "sort", zh: "分类" }, { word: "fold", zh: "折叠" }],
    guide: "Tap two beats on your knees: LAWN — dree.", guideZh: "在膝盖上拍两下：LAWN — dree。",
    discovery: "A laundry basket can hold clothes before and after washing.", discoveryZh: "洗衣篮可以放待洗或已洗的衣物。",
    soundTip: "Make LAWN strong and let dree stay light.", soundTipZh: "LAWN 读得有力，dree 读得轻一些。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/laundry",
  }),
  item({
    id: "dishes", sceneId: "chores", word: "dishes", wordZh: "餐具；盘碗",
    chunks: [{ id: "dish", text: "dish", cue: "DISH", stressed: true }, { id: "es", text: "es", cue: "iz", stressed: false }], pronunciation: "DISH · iz", ipa: "/ˈdɪʃ.ɪz/",
    description: ["Dishes include plates, bowls, and cups.", "Use soap to wash away grease and food.", "Put clean dishes on a rack to dry."],
    descriptionZh: ["餐具包括盘子、碗和杯子。", "用洗洁精洗去油污和食物残渣。", "把干净餐具放到沥水架上晾干。"],
    descriptionKeywords: [{ word: "plates", zh: "盘子" }, { word: "soap", zh: "洗洁精" }, { word: "rack", zh: "架子" }],
    guide: "Point to a plate, a bowl, and a cup as you name them.", guideZh: "说出 plate、bowl 和 cup 时，指一指它们。",
    discovery: "Warm water and soap help loosen greasy food from dishes.", discoveryZh: "温水和洗洁精能帮助松开餐具上的油污。",
    soundTip: "After sh, add a tiny iz sound for the plural.", soundTipZh: "sh 后面加一个很短的 iz，表示复数。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/dish",
  }),
  item({
    id: "tidy", sceneId: "chores", word: "tidy", wordZh: "整理；整齐的",
    chunks: [{ id: "ti", text: "ti", cue: "TYE", stressed: true }, { id: "dy", text: "dy", cue: "dee", stressed: false }], pronunciation: "TYE · dee", ipa: "/ˈtaɪ.di/",
    description: ["We tidy a room by putting things away.", "Give every toy a home on a shelf or in a box.", "A clear floor is safer for walking."],
    descriptionZh: ["我们把物品归位，让房间变整齐。", "给每个玩具在架子或盒子里安一个家。", "地板空出来，走路更安全。"],
    descriptionKeywords: [{ word: "putting things away", zh: "把物品归位" }, { word: "home", zh: "固定位置" }, { word: "clear floor", zh: "空出的地板" }],
    guide: "Choose three nearby objects and return each one to its home.", guideZh: "选身边三样物品，把它们送回固定位置。",
    discovery: "Tidying is easier when similar things share one labelled box.", discoveryZh: "把同类物品放进一个有标签的盒子，整理会更轻松。",
    soundTip: "TYE rhymes with my; finish with a light dee.", soundTipZh: "TYE 和 my 押韵，最后轻读 dee。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/tidy",
  }),
  item({
    id: "vacuum", sceneId: "chores", word: "vacuum", wordZh: "用吸尘器清洁；吸尘器",
    chunks: [{ id: "vac", text: "vac", cue: "VAK", stressed: true }, { id: "u", text: "u", cue: "yoo", stressed: false }, { id: "um", text: "um", cue: "um", stressed: false }], pronunciation: "VAK · yoo · um", ipa: "/ˈvæk.ju.əm/",
    description: ["A vacuum cleaner pulls in air and dust.", "Move the floor head slowly over a carpet.", "Empty the dust container when it is full."],
    descriptionZh: ["吸尘器把空气和灰尘吸进去。", "把吸头缓慢地移过地毯。", "集尘盒满了要及时清空。"],
    descriptionKeywords: [{ word: "air", zh: "空气" }, { word: "carpet", zh: "地毯" }, { word: "dust container", zh: "集尘盒" }],
    guide: "Use one finger to trace the hose from the floor head to the machine.", guideZh: "用手指从吸头沿着软管指到机器。",
    discovery: "A fan inside a vacuum cleaner creates moving air that carries dust in.", discoveryZh: "吸尘器里的风扇让空气流动，把灰尘带进去。",
    soundTip: "Make VAK strong, then say yoo-um without rushing.", soundTipZh: "VAK 读得有力，再不慌不忙地说 yoo-um。",
    factSourceUrl: "https://www.britannica.com/technology/vacuum-cleaner",
  }),
  item({
    id: "recycle", sceneId: "chores", word: "recycle", wordZh: "回收利用",
    chunks: [{ id: "re", text: "re", cue: "ree", stressed: false }, { id: "cy", text: "cy", cue: "SY", stressed: true }, { id: "cle", text: "cle", cue: "kuhl", stressed: false }], pronunciation: "ree · SY · kuhl", ipa: "/ˌriːˈsaɪ.kəl/",
    description: ["We recycle clean paper, metal, glass, and some plastic.", "Put each accepted item into the correct bin.", "Recycling turns old material into something useful again."],
    descriptionZh: ["我们回收干净的纸、金属、玻璃和某些塑料。", "把可接收的物品放进正确的回收箱。", "回收利用能把旧材料再次变成有用的东西。"],
    descriptionKeywords: [{ word: "metal", zh: "金属" }, { word: "bin", zh: "回收箱" }, { word: "material", zh: "材料" }],
    guide: "Look for the recycling symbol, then ask whether the item is clean and accepted.", guideZh: "先找回收标志，再判断物品是否干净、是否可回收。",
    discovery: "Singapore's blue recycling bins accept common paper, plastic, glass, and metal items.", discoveryZh: "新加坡的蓝色回收箱接收常见的纸、塑料、玻璃和金属物品。",
    soundTip: "Make SY the strong beat: ree-SY-kuhl.", soundTipZh: "SY 是最有力的一拍：ree-SY-kuhl。",
    factSourceUrl: "https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/national-recycling-programme",
  }),
  item({
    id: "dusting", sceneId: "chores", word: "dusting", wordZh: "擦灰；掸尘",
    chunks: [{ id: "dust", text: "dust", cue: "DUST", stressed: true }, { id: "ing", text: "ing", cue: "ing", stressed: false }], pronunciation: "DUST · ing", ipa: "/ˈdʌs.tɪŋ/",
    description: ["Dusting removes fine dust from a surface.", "Use a soft cloth or a feather duster.", "Move gently so dust does not fly everywhere."],
    descriptionZh: ["擦灰能清除物体表面的细小灰尘。", "可以使用软布或羽毛掸子。", "动作轻一点，灰尘就不会到处飞。"],
    descriptionKeywords: [{ word: "surface", zh: "表面" }, { word: "soft cloth", zh: "软布" }, { word: "gently", zh: "轻轻地" }],
    guide: "Pretend to wipe a shelf from one end to the other.", guideZh: "假装用布从架子的一端擦到另一端。",
    discovery: "A damp microfibre cloth can trap dust instead of pushing it into the air.", discoveryZh: "微湿的超细纤维布能抓住灰尘，不让它飞进空气里。",
    soundTip: "Keep the st together, then add ing.", soundTipZh: "把 dust 结尾的 st 连在一起，再加 ing。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/dust",
  }),

  item({
    id: "backpack", sceneId: "school", word: "backpack", wordZh: "双肩书包",
    chunks: [{ id: "back", text: "back", cue: "BACK", stressed: true }, { id: "pack", text: "pack", cue: "pack", stressed: false }], pronunciation: "BACK · pack", ipa: "/ˈbæk.pæk/",
    description: ["A backpack carries books and school supplies.", "Wear both shoulder straps to share the load.", "Pack heavy items close to your back."],
    descriptionZh: ["书包用来装书和学习用品。", "两条肩带都背上，可以分担重量。", "把较重的物品放在靠近背部的位置。"],
    descriptionKeywords: [{ word: "school supplies", zh: "学习用品" }, { word: "shoulder straps", zh: "肩带" }, { word: "heavy items", zh: "较重物品" }],
    guide: "Touch both shoulders, then mime packing one book near your back.", guideZh: "摸摸两边肩膀，再模仿把一本书放在靠近背部的地方。",
    discovery: "Two snug straps help keep a backpack steady and balanced.", discoveryZh: "两条合适的肩带能让书包更稳、更平衡。",
    soundTip: "Say two clear parts with the same short a as cat.", soundTipZh: "两部分都用和 cat 一样的短 a。",
    factSourceUrl: "https://kidshealth.org/en/parents/backpack-safety.html",
  }),
  item({
    id: "classroom", sceneId: "school", word: "classroom", wordZh: "教室",
    chunks: [{ id: "class", text: "class", cue: "CLASS", stressed: true }, { id: "room", text: "room", cue: "room", stressed: false }], pronunciation: "CLASS · room", ipa: "/ˈklæs.ruːm/",
    description: ["A classroom is a room where a class learns.", "It may have desks, a board, and learning displays.", "We listen, ask questions, and work together there."],
    descriptionZh: ["教室是一个班级学习的房间。", "教室里可能有课桌、教学板和学习展示。", "我们在那里倾听、提问和合作。"],
    descriptionKeywords: [{ word: "class", zh: "班级" }, { word: "desks", zh: "课桌" }, { word: "work together", zh: "合作" }],
    guide: "Find the desks, board, and displays in the picture.", guideZh: "在图中找到课桌、教学板和展示区。",
    discovery: "A classroom can change layout for reading, group work, art, or science.", discoveryZh: "教室可以为阅读、小组合作、美术或科学调整布局。",
    soundTip: "Blend class and room without pausing too long.", soundTipZh: "把 class 和 room 连起来，中间不要停太久。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/classroom",
  }),
  item({
    id: "notebook", sceneId: "school", word: "notebook", wordZh: "笔记本",
    chunks: [{ id: "note", text: "note", cue: "NOTE", stressed: true }, { id: "book", text: "book", cue: "book", stressed: false }], pronunciation: "NOTE · book", ipa: "/ˈnoʊt.bʊk/",
    description: ["A notebook has pages joined together for writing.", "Write the date and a clear title at the top.", "Use each page for notes, drawings, or ideas."],
    descriptionZh: ["笔记本把许多用于书写的纸页装订在一起。", "在顶端写上日期和清楚的标题。", "每页可以记笔记、画图或写想法。"],
    descriptionKeywords: [{ word: "pages", zh: "纸页" }, { word: "title", zh: "标题" }, { word: "ideas", zh: "想法" }],
    guide: "Open an imaginary notebook and write today's date in the air.", guideZh: "打开想象中的笔记本，在空中写今天的日期。",
    discovery: "Numbering pages can help you find earlier work again.", discoveryZh: "给纸页编号，可以更容易找回之前的内容。",
    soundTip: "Let note rhyme with boat, then add book.", soundTipZh: "note 和 boat 押韵，后面再加 book。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/notebook",
  }),
  item({
    id: "ruler", sceneId: "school", word: "ruler", wordZh: "尺子",
    chunks: [{ id: "rul", text: "rul", cue: "ROO", stressed: true }, { id: "er", text: "er", cue: "ler", stressed: false }], pronunciation: "ROO · ler", ipa: "/ˈruː.lɚ/",
    description: ["A ruler measures length and draws straight lines.", "Place the zero mark at one end of the object.", "Read the scale where the other end stops."],
    descriptionZh: ["尺子用来测量长度和画直线。", "把 0 刻度对齐物体的一端。", "物体另一端停在哪里，就读那里的刻度。"],
    descriptionKeywords: [{ word: "length", zh: "长度" }, { word: "zero mark", zh: "0 刻度" }, { word: "scale", zh: "刻度" }],
    guide: "Use two fingers as a ruler and measure the width of your book.", guideZh: "把两根手指当成尺子，量一量书有多宽。",
    discovery: "Centimetres are smaller than metres: one metre has one hundred centimetres.", discoveryZh: "厘米比米小：1 米等于 100 厘米。",
    soundTip: "Stretch roo a little, then curl into ler.", soundTipZh: "roo 稍微拉长，再轻轻转入 ler。",
    factSourceUrl: "https://www.nist.gov/pml/owm/si-units-length",
  }),
  item({
    id: "scissors", sceneId: "school", word: "scissors", wordZh: "剪刀",
    chunks: [{ id: "sci", text: "sci", cue: "SIZ", stressed: true }, { id: "ssors", text: "ssors", cue: "urz", stressed: false }], pronunciation: "SIZ · urz", ipa: "/ˈsɪz.ɚz/",
    description: ["Scissors have two blades joined at a pivot.", "The handles open and close the blades.", "Carry scissors closed with the points facing down."],
    descriptionZh: ["剪刀有两片在转轴处连接的刀片。", "手柄能让刀片打开和闭合。", "携带剪刀时要闭合，尖端朝下。"],
    descriptionKeywords: [{ word: "blades", zh: "刀片" }, { word: "handles", zh: "手柄" }, { word: "points", zh: "尖端" }],
    guide: "Use two fingers to mime safe opening and closing.", guideZh: "用两根手指模仿剪刀安全地开合。",
    discovery: "A pivot lets the two blades move past each other to cut.", discoveryZh: "转轴让两片刀片交叉移动，从而剪开材料。",
    soundTip: "The spelling is tricky: say SIZ-urz, not sky-sors.", soundTipZh: "这个词的拼写很特别：读 SIZ-urz，不读 sky-sors。",
    factSourceUrl: "https://www.britannica.com/technology/scissors",
  }),
  item({
    id: "library", sceneId: "school", word: "library", wordZh: "图书馆",
    chunks: [{ id: "li", text: "li", cue: "LYE", stressed: true }, { id: "bra", text: "bra", cue: "brair", stressed: false }, { id: "ry", text: "ry", cue: "ee", stressed: false }], pronunciation: "LYE · brair · ee", ipa: "/ˈlaɪ.brer.i/",
    description: ["A library keeps books and other information resources.", "A librarian helps people find and borrow materials.", "Return borrowed books by their due date."],
    descriptionZh: ["图书馆收藏书籍和其他信息资源。", "图书管理员帮助人们查找和借阅资料。", "在到期日前归还借来的书。"],
    descriptionKeywords: [{ word: "resources", zh: "资源" }, { word: "librarian", zh: "图书管理员" }, { word: "due date", zh: "到期日" }],
    guide: "Pretend to scan a shelf from left to right to find one title.", guideZh: "假装从左到右查看书架，找到一个书名。",
    discovery: "Libraries arrange books in sections so readers can find similar subjects together.", discoveryZh: "图书馆把书分区摆放，读者可以一起找到相似主题。",
    soundTip: "Make LYE strong; keep brair-ee smooth and quick.", soundTipZh: "LYE 读得有力，brair-ee 连起来快一些。",
    factSourceUrl: "https://www.britannica.com/topic/library",
  }),
  item({
    id: "timetable", sceneId: "school", word: "timetable", wordZh: "课程表；时间表",
    chunks: [{ id: "time", text: "time", cue: "TIME", stressed: true }, { id: "ta", text: "ta", cue: "tay", stressed: false }, { id: "ble", text: "ble", cue: "buhl", stressed: false }], pronunciation: "TIME · tay · buhl", ipa: "/ˈtaɪmˌteɪ.bəl/",
    description: ["A timetable shows activities and their times.", "Read across a row to find each day's lessons.", "Check the timetable before you pack your bag."],
    descriptionZh: ["时间表列出活动和它们的时间。", "沿着一行阅读，找到每天的课程。", "收拾书包前先查看课程表。"],
    descriptionKeywords: [{ word: "activities", zh: "活动" }, { word: "row", zh: "行" }, { word: "pack", zh: "收拾" }],
    guide: "Point to a day, move along its row, and name the first lesson.", guideZh: "指一天，沿着它的那一行移动，说出第一节课。",
    discovery: "A timetable helps a school share rooms, teachers, and time in an organised way.", discoveryZh: "课程表帮助学校有序安排教室、老师和时间。",
    soundTip: "Start with the strong word time, then add tay-buhl.", soundTipZh: "先有力地说 time，再加 tay-buhl。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/timetable",
  }),
  item({
    id: "homework", sceneId: "school", word: "homework", wordZh: "家庭作业",
    chunks: [{ id: "home", text: "home", cue: "HOME", stressed: true }, { id: "work", text: "work", cue: "work", stressed: false }], pronunciation: "HOME · work", ipa: "/ˈhoʊm.wɝk/",
    description: ["Homework is school work done outside class.", "Read the instructions before you begin.", "Check your answers and pack the finished work."],
    descriptionZh: ["家庭作业是在课堂外完成的学校任务。", "开始前先阅读说明。", "检查答案，再把完成的作业收进书包。"],
    descriptionKeywords: [{ word: "outside class", zh: "课堂外" }, { word: "instructions", zh: "说明" }, { word: "check", zh: "检查" }],
    guide: "Use three fingers for a plan: read, do, check.", guideZh: "用三根手指记住计划：读要求、做作业、再检查。",
    discovery: "A short break between tasks can help attention return.", discoveryZh: "任务之间短暂休息，可以帮助注意力回来。",
    soundTip: "Blend home and work into one compound word.", soundTipZh: "把 home 和 work 连成一个合成词。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/homework",
  }),

  item({
    id: "swing", sceneId: "playground", word: "swing", wordZh: "秋千；摆动",
    chunks: [{ id: "swing", text: "swing", cue: "SWING", stressed: true }], pronunciation: "SWING", ipa: "/swɪŋ/",
    description: ["A swing hangs from chains or ropes.", "It moves forward and backward in an arc.", "Hold on with both hands and wait until it stops before getting off."],
    descriptionZh: ["秋千用链条或绳子悬挂。", "它沿着弧线前后摆动。", "双手抓紧，等秋千停稳再下来。"],
    descriptionKeywords: [{ word: "chains", zh: "链条" }, { word: "arc", zh: "弧线" }, { word: "both hands", zh: "双手" }],
    guide: "Move one hand like a pendulum while saying forward and backward.", guideZh: "让一只手像钟摆一样移动，同时说 forward and backward。",
    discovery: "A longer swing takes more time to complete one back-and-forth movement.", discoveryZh: "更长的秋千完成一次往返摆动需要更多时间。",
    soundTip: "Start with sw, then finish with the ng sound in sing.", soundTipZh: "先说 sw，最后用 sing 里的 ng 音收尾。",
    factSourceUrl: "https://www.britannica.com/science/pendulum",
  }),
  item({
    id: "slide", sceneId: "playground", word: "slide", wordZh: "滑梯；滑下",
    chunks: [{ id: "slide", text: "slide", cue: "SLYDE", stressed: true }], pronunciation: "SLYDE", ipa: "/slaɪd/",
    description: ["A slide has a raised top and a sloping surface.", "Gravity pulls a rider down the slope.", "Sit facing forward and keep the landing clear."],
    descriptionZh: ["滑梯有较高的顶端和倾斜表面。", "重力把人沿着斜面向下拉。", "面向前方坐好，保持出口没有人停留。"],
    descriptionKeywords: [{ word: "sloping surface", zh: "倾斜表面" }, { word: "gravity", zh: "重力" }, { word: "landing", zh: "出口区" }],
    guide: "Tilt one arm like a slope and let two fingers slide down it.", guideZh: "把一只手臂斜着当斜坡，让两根手指滑下来。",
    discovery: "A steeper slope can make an object speed up more quickly.", discoveryZh: "更陡的斜坡可以让物体更快加速。",
    soundTip: "Keep sl together; the final e is silent.", soundTipZh: "把 sl 连在一起；最后的 e 不发音。",
    factSourceUrl: "https://www.britannica.com/science/inclined-plane",
  }),
  item({
    id: "seesaw", sceneId: "playground", word: "seesaw", wordZh: "跷跷板",
    chunks: [{ id: "see", text: "see", cue: "SEE", stressed: true }, { id: "saw", text: "saw", cue: "saw", stressed: false }], pronunciation: "SEE · saw", ipa: "/ˈsiː.sɔː/",
    description: ["A seesaw is a long board balanced on a pivot.", "When one side goes down, the other side rises.", "Two riders can push gently with their legs."],
    descriptionZh: ["跷跷板是一块在支点上保持平衡的长板。", "一边向下时，另一边会升起。", "两个玩的人可以用腿轻轻用力。"],
    descriptionKeywords: [{ word: "pivot", zh: "支点" }, { word: "rises", zh: "升起" }, { word: "gently", zh: "轻轻地" }],
    guide: "Hold both hands level, then move one up as the other goes down.", guideZh: "两只手先保持水平，再一只向上、另一只向下。",
    discovery: "A seesaw is a lever with its pivot between the two riders.", discoveryZh: "跷跷板是一种杠杆，支点在两个人之间。",
    soundTip: "Both parts are clear: SEE-saw.", soundTipZh: "两部分都要读清楚：SEE-saw。",
    factSourceUrl: "https://www.britannica.com/technology/lever",
  }),
  item({
    id: "sandbox", sceneId: "playground", word: "sandbox", wordZh: "沙坑；沙盒",
    chunks: [{ id: "sand", text: "sand", cue: "SAND", stressed: true }, { id: "box", text: "box", cue: "box", stressed: false }], pronunciation: "SAND · box", ipa: "/ˈsænd.bɑːks/",
    description: ["A sandbox holds loose sand inside a border.", "Children can scoop, pour, and build with the sand.", "Cover the sandbox when it is not in use to help keep it clean."],
    descriptionZh: ["沙坑用边框围住松散的沙。", "孩子可以铲沙、倒沙和用沙搭建。", "不使用时把沙坑盖起来，有助于保持清洁。"],
    descriptionKeywords: [{ word: "border", zh: "边框" }, { word: "scoop", zh: "铲取" }, { word: "cover", zh: "盖起来" }],
    guide: "Mime scooping one cup of sand and pouring it into a mould.", guideZh: "模仿铲一杯沙，再倒进模具里。",
    discovery: "Damp sand holds a shape better than very dry sand because water helps grains stick together.", discoveryZh: "湿沙比很干的沙更容易保持形状，因为水帮助沙粒粘在一起。",
    soundTip: "Say sand, then move straight into box.", soundTipZh: "先说 sand，再直接连到 box。",
    factSourceUrl: "https://www.britannica.com/science/sand",
  }),
  item({
    id: "climbing-frame", sceneId: "playground", word: "climbing frame", wordZh: "攀爬架",
    chunks: [{ id: "climb", text: "climb", cue: "CLYME", stressed: true }, { id: "ing-space", text: "ing ", cue: "ing", stressed: false }, { id: "frame", text: "frame", cue: "fraym", stressed: false }], pronunciation: "CLYME · ing · fraym", ipa: "/ˈklaɪ.mɪŋ ˌfreɪm/",
    description: ["A climbing frame has bars, steps, or nets for climbing.", "Use three points of contact when you move.", "Look for a safe route before you climb higher."],
    descriptionZh: ["攀爬架有杆子、台阶或网，供人攀爬。", "移动时保持三个接触点。", "向更高处爬前，先观察安全路线。"],
    descriptionKeywords: [{ word: "nets", zh: "攀爬网" }, { word: "points of contact", zh: "接触点" }, { word: "route", zh: "路线" }],
    guide: "Choose an imaginary hand-hand-foot route and move slowly.", guideZh: "选一条想象中的手—手—脚路线，慢慢移动。",
    discovery: "Climbing practises grip, coordination, and planning at the same time.", discoveryZh: "攀爬可以同时练习抓握、协调和路线计划。",
    soundTip: "The b in climb is silent; finish the first word with m.", soundTipZh: "climb 里的 b 不发音，第一个词以 m 收尾。",
    factSourceUrl: "https://dictionary.cambridge.org/dictionary/english/climbing-frame",
  }),
  item({
    id: "monkey-bars", sceneId: "playground", word: "monkey bars", wordZh: "猴架；攀爬横杠",
    chunks: [{ id: "mon", text: "mon", cue: "MUNG", stressed: true }, { id: "key-space", text: "key ", cue: "kee", stressed: false }, { id: "bars", text: "bars", cue: "barz", stressed: false }], pronunciation: "MUNG · kee · barz", ipa: "/ˈmʌŋ.ki ˌbɑːrz/",
    description: ["Monkey bars are a row of overhead bars.", "A player can hang and move from one bar to the next.", "Wait for clear space before crossing."],
    descriptionZh: ["猴架是一排位于头顶上方的横杠。", "玩的人可以悬挂，并从一根横杠移到下一根。", "等前方空出来再开始通过。"],
    descriptionKeywords: [{ word: "overhead", zh: "头顶上方的" }, { word: "hang", zh: "悬挂" }, { word: "clear space", zh: "空出的位置" }],
    guide: "Reach up left, then right, as if moving across two bars.", guideZh: "先左手向上，再右手向上，模仿横移两根杆。",
    discovery: "Hanging uses grip and shoulder muscles while the body swings below the bars.", discoveryZh: "悬挂会用到握力和肩部肌肉，身体在横杆下方摆动。",
    soundTip: "Make MUNG the strong beat, then say kee-barz.", soundTipZh: "MUNG 读得最有力，后面连说 kee-barz。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/monkey%20bars",
  }),
  item({
    id: "hopscotch", sceneId: "playground", word: "hopscotch", wordZh: "跳房子游戏",
    chunks: [{ id: "hop", text: "hop", cue: "HOP", stressed: true }, { id: "scotch", text: "scotch", cue: "skotch", stressed: false }], pronunciation: "HOP · skotch", ipa: "/ˈhɑːp.skɑːtʃ/",
    description: ["Hopscotch uses numbered spaces drawn on the ground.", "Toss a marker, then hop through the spaces.", "Land on one foot or two feet as the pattern shows."],
    descriptionZh: ["跳房子使用画在地面上的编号格子。", "抛出标记物，再跳过各个格子。", "按图案要求用一只脚或两只脚落地。"],
    descriptionKeywords: [{ word: "numbered spaces", zh: "编号格子" }, { word: "marker", zh: "标记物" }, { word: "one foot", zh: "一只脚" }],
    guide: "Draw three pretend squares and hop: one foot, two feet, one foot.", guideZh: "画三个想象的方格，按一脚、两脚、一脚跳。",
    discovery: "Hopscotch combines counting, aiming, hopping, and balance.", discoveryZh: "跳房子把数数、瞄准、跳跃和平衡练习放在一起。",
    soundTip: "Keep the p and sk close: HOP-skotch.", soundTipZh: "让 p 和 sk 靠近：HOP-skotch。",
    factSourceUrl: "https://www.britannica.com/topic/hopscotch",
  }),
  item({
    id: "balance", sceneId: "playground", word: "balance", wordZh: "平衡",
    chunks: [{ id: "bal", text: "bal", cue: "BAL", stressed: true }, { id: "ance", text: "ance", cue: "uhns", stressed: false }], pronunciation: "BAL · uhns", ipa: "/ˈbæl.əns/",
    description: ["Balance means keeping your body steady and upright.", "Stretch your arms out to make small corrections.", "Look ahead and place each foot carefully."],
    descriptionZh: ["平衡就是让身体稳定、保持直立。", "伸开手臂，做小幅度调整。", "看向前方，小心放稳每一只脚。"],
    descriptionKeywords: [{ word: "upright", zh: "直立的" }, { word: "corrections", zh: "调整" }, { word: "carefully", zh: "小心地" }],
    guide: "Stand heel-to-toe for five seconds with arms stretched out.", guideZh: "脚跟对脚尖站五秒，同时伸开双臂。",
    discovery: "A wider base of support usually makes an object or body more stable.", discoveryZh: "支撑面越宽，物体或身体通常越稳定。",
    soundTip: "Use the short a in cat for BAL, then relax into uhns.", soundTipZh: "BAL 里用 cat 的短 a，再放松读 uhns。",
    factSourceUrl: "https://www.britannica.com/science/equilibrium-physics",
  }),
] as const;
