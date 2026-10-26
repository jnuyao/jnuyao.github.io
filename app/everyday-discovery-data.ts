import {
  HOME_SCHOOL_PLAY_IMAGE_CREDITS,
  HOME_SCHOOL_PLAY_ITEMS,
  HOME_SCHOOL_PLAY_SCENES,
} from "./everyday-discovery-home-school-play-data.ts";
import {
  MARKET_WEATHER_IMAGE_CREDITS,
  MARKET_WEATHER_ITEMS,
  MARKET_WEATHER_SCENES,
} from "./everyday-discovery-market-weather-data.ts";
import {
  TRANSPORT_BODY_IMAGE_CREDITS,
  TRANSPORT_BODY_ITEMS,
  TRANSPORT_BODY_SCENES,
} from "./everyday-discovery-transport-body-data.ts";

export const EVERYDAY_DISCOVERY_SCENE_IDS = [
  "kitchen",
  "animals",
  "plants",
  "supermarket",
  "weather",
  "transport",
  "body",
  "chores",
  "school",
  "playground",
] as const;

export type EverydayDiscoverySceneId = (typeof EVERYDAY_DISCOVERY_SCENE_IDS)[number];

export const EVERYDAY_DISCOVERY_IDS = [
  "onion",
  "carrot",
  "tomato",
  "spatula",
  "saucepan",
  "ingredient",
  "slice",
  "stir",
  "rabbit",
  "squirrel",
  "penguin",
  "crocodile",
  "octopus",
  "habitat",
  "camouflage",
  "nocturnal",
  "seed",
  "root",
  "stem",
  "leaf",
  "sunflower",
  "dandelion",
  "germination",
  "pollination",
  "trolley",
  "basket",
  "aisle",
  "cashier",
  "receipt",
  "barcode",
  "groceries",
  "checkout",
  "sunny",
  "cloudy",
  "windy",
  "rainy",
  "thunderstorm",
  "lightning",
  "temperature",
  "forecast",
  "bicycle",
  "scooter",
  "bus",
  "train",
  "station",
  "passenger",
  "pedestrian",
  "traffic-light",
  "shoulder",
  "elbow",
  "wrist",
  "knee",
  "ankle",
  "lungs",
  "muscles",
  "skeleton",
  "sweep",
  "mop",
  "laundry",
  "dishes",
  "tidy",
  "vacuum",
  "recycle",
  "dusting",
  "backpack",
  "classroom",
  "notebook",
  "ruler",
  "scissors",
  "library",
  "timetable",
  "homework",
  "swing",
  "slide",
  "seesaw",
  "sandbox",
  "climbing-frame",
  "monkey-bars",
  "hopscotch",
  "balance",
] as const;

export type EverydayDiscoveryId = (typeof EVERYDAY_DISCOVERY_IDS)[number];

export type EverydayDiscoveryChunk = {
  id: string;
  text: string;
  cue: string;
  stressed: boolean;
};

export type EverydayDiscoveryKeyword = {
  word: string;
  zh: string;
};

export type EverydayDiscoveryImageCredit = {
  author: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
  adaptation?: string;
};

export type EverydayDiscoveryItem = {
  id: EverydayDiscoveryId;
  sceneId: EverydayDiscoverySceneId;
  word: string;
  wordZh: string;
  imageSrc: string;
  chunks: readonly EverydayDiscoveryChunk[];
  pronunciation: string;
  ipa: string;
  description: readonly [string, string, string];
  descriptionZh: readonly [string, string, string];
  descriptionKeywords: readonly [
    EverydayDiscoveryKeyword,
    EverydayDiscoveryKeyword,
    EverydayDiscoveryKeyword,
  ];
  discovery: string;
  discoveryZh: string;
  soundTip: string;
  soundTipZh: string;
  coachScript: string;
  wordAudioSrc: string;
  coachAudioSrc: string;
  descriptionAudioSrc: string;
  imageCredit?: EverydayDiscoveryImageCredit;
  factSourceUrl: string;
};

export type EverydayDiscoveryChallenge = {
  prompt: string;
  promptZh: string;
  options: readonly {
    id: string;
    label: string;
    labelZh: string;
    icon: string;
  }[];
  answerId: string;
  success: string;
  successZh: string;
};

export type EverydayDiscoveryScene = {
  id: EverydayDiscoverySceneId;
  title: string;
  titleZh: string;
  icon: string;
  accent: string;
  eyebrow: string;
  description: string;
  descriptionZh: string;
  itemIds: readonly EverydayDiscoveryId[];
  challenge: EverydayDiscoveryChallenge;
};

const IMAGE_ROOT = "/everyday-discovery";
const AUDIO_ROOT = "/everyday-discovery-audio";

const CORE_EVERYDAY_DISCOVERY_IMAGE_CREDITS = {
  onion: { author: "Colin", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Onion_on_White.JPG", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", adaptation: "cropped and resized" },
  carrot: { author: "Yerson Retamel", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fresh_Carrots.jpg", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", adaptation: "cropped and resized" },
  tomato: { author: "Nat1620", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_tomato.jpg", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", adaptation: "cropped and resized" },
  spatula: { author: "Evan-Amos", license: "Public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Kitchen-spatula.jpg", licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Public_domain", adaptation: "cropped and resized" },
  saucepan: { author: "Donovan Govan", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Saucepan.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", adaptation: "cropped and resized" },
  ingredient: { author: "Alabama Extension / Janet Guynn", license: "CC0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Ingredients_for_Cooking.jpg", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en", adaptation: "cropped and resized" },
  slice: { author: "Shixart1985", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Carrots_being_chopped_on_a_wooden_board_in_a_rustic_kitchen.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0", adaptation: "cropped and resized" },
  stir: { author: "Shixart1985", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Mixing_ingredients_with_a_wooden_spoon_in_a_blue_bowl_on_a_wooden_table_near_jars_of_oats_and_other_food_items.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0", adaptation: "cropped and resized" },
  rabbit: { author: "Charles J. Sharp", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:European_rabbit_(Oryctolagus_cuniculus)_Heligan.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  squirrel: { author: "Charles J. Sharp", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Grey_squirrel_(Sciurus_carolinensis)_02.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  penguin: { author: "Christopher Michel", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Penguin_in_Antarctica_jumping_out_of_the_water.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0", adaptation: "cropped and resized" },
  crocodile: { author: "Diego Delso", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Cocodrilo_del_Nilo_(Crocodylus_niloticus),_parque_nacional_de_Chobe,_Botsuana,_2018-07-28,_DD_86.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  octopus: { author: "Nick Hobgood", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Octopus_marginatus.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", adaptation: "cropped and resized" },
  habitat: { author: "Giles Laurent", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:179_Male_African_bush_elephants_drinking_in_Etosha_National_Park_Photo_by_Giles_Laurent.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  camouflage: { author: "Nireekshit", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Leaf-Insect.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  nocturnal: { author: "Charles J. Sharp", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Large_flying_foxes_(Pteropus_vampyrus)_in_flight_from_Pulau_Kalong_Rinca.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", adaptation: "cropped and resized" },
  seed: { author: "Sanjay Acharya", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Pinto_Beans_Seeds.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", adaptation: "cropped and resized" },
  root: { author: "Shixart1985", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Person_holding_a_rooted_plant_with_soil_outdoors_in_a_garden_on_a_cloudy_day.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "resized over a blurred crop" },
  stem: { author: "liz west", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Tomato_stems.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "cropped and resized" },
  leaf: { author: "Star61", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Green_leaf_vein.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", adaptation: "cropped and resized" },
  sunflower: { author: "Evelyn Maxey", license: "CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Yellow_sunflower_close-up.jpg", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", adaptation: "cropped and resized" },
  dandelion: { author: "Huw Williams (Huwmanbeing)", license: "Public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Dandelion.png", licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-self", adaptation: "cropped, resized and converted to JPEG" },
  germination: { author: "Doronenko", license: "CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Bean_germination.jpg", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", adaptation: "resized over a blurred crop" },
  pollination: { author: "Tfbybyhf", license: "CC0 1.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Bee_on_Flowers_2.jpg", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", adaptation: "cropped and resized" },
} as const satisfies Partial<Record<EverydayDiscoveryId, EverydayDiscoveryImageCredit>>;

export const EVERYDAY_DISCOVERY_IMAGE_CREDITS = {
  ...CORE_EVERYDAY_DISCOVERY_IMAGE_CREDITS,
  ...MARKET_WEATHER_IMAGE_CREDITS,
  ...TRANSPORT_BODY_IMAGE_CREDITS,
  ...HOME_SCHOOL_PLAY_IMAGE_CREDITS,
} as const satisfies Record<EverydayDiscoveryId, EverydayDiscoveryImageCredit>;

function audioSources(sceneId: EverydayDiscoverySceneId, id: EverydayDiscoveryId) {
  const root = `${AUDIO_ROOT}/${sceneId}/${id}`;
  return {
    wordAudioSrc: `${root}/whole.mp3`,
    coachAudioSrc: `${root}/coach.mp3`,
    descriptionAudioSrc: `${root}/description.mp3`,
  };
}

function item(
  definition: Omit<
    EverydayDiscoveryItem,
    "imageSrc" | "wordAudioSrc" | "coachAudioSrc" | "descriptionAudioSrc" | "coachScript"
  > & { coachScript?: string },
): EverydayDiscoveryItem {
  const chunkCues = definition.chunks.map((chunk) => chunk.cue).join(". ");
  return {
    ...definition,
    imageSrc: `${IMAGE_ROOT}/${definition.sceneId}/${definition.id}.jpg`,
    imageCredit: CORE_EVERYDAY_DISCOVERY_IMAGE_CREDITS[
      definition.id as keyof typeof CORE_EVERYDAY_DISCOVERY_IMAGE_CREDITS
    ],
    coachScript: definition.coachScript
      ?? `Listen, then say each part: ${chunkCues}. Now blend it: ${definition.pronunciation}. ${definition.word}.`,
    ...audioSources(definition.sceneId, definition.id),
  };
}

export const EVERYDAY_DISCOVERY_SCENES: readonly EverydayDiscoveryScene[] = [
  {
    id: "kitchen",
    title: "Kitchen Lab",
    titleZh: "厨房小实验室",
    icon: "🥣",
    accent: "#d66f43",
    eyebrow: "Wash · Cut · Mix",
    description: "Meet foods, tools and action words while making an imaginary meal.",
    descriptionZh: "一边准备想象中的一餐，一边认识食物、厨具和动作词。",
    itemIds: ["onion", "carrot", "tomato", "spatula", "saucepan", "ingredient", "slice", "stir"],
    challenge: {
      prompt: "We washed the carrot. What should we do before we stir it into the soup?",
      promptZh: "胡萝卜洗好了。把它搅进汤里之前，应该先做什么？",
      options: [
        { id: "slice", label: "Slice it", labelZh: "把它切片", icon: "🔪" },
        { id: "sleep", label: "Put it to sleep", labelZh: "让它睡觉", icon: "😴" },
        { id: "hide", label: "Hide it", labelZh: "把它藏起来", icon: "🙈" },
      ],
      answerId: "slice",
      success: "Yes! Wash, slice, then stir.",
      successZh: "答对了！先洗，再切，最后搅拌。",
    },
  },
  {
    id: "animals",
    title: "Animal Explorer",
    titleZh: "动物探索营",
    icon: "🐾",
    accent: "#4e7fb4",
    eyebrow: "Look · Compare · Discover",
    description: "Meet animals, then learn the big words scientists use to describe their lives.",
    descriptionZh: "认识动物，也学会科学家描述动物生活时会用的大词。",
    itemIds: ["rabbit", "squirrel", "penguin", "crocodile", "octopus", "habitat", "camouflage", "nocturnal"],
    challenge: {
      prompt: "Which word means the natural home where an animal finds food, water and shelter?",
      promptZh: "哪个词表示动物找到食物、水和庇护的自然家园？",
      options: [
        { id: "habitat", label: "Habitat", labelZh: "栖息地", icon: "🏞️" },
        { id: "spatula", label: "Spatula", labelZh: "锅铲", icon: "🍳" },
        { id: "sunflower", label: "Sunflower", labelZh: "向日葵", icon: "🌻" },
      ],
      answerId: "habitat",
      success: "Exactly! A habitat is an animal's natural home.",
      successZh: "没错！habitat 就是动物的自然家园。",
    },
  },
  {
    id: "plants",
    title: "Plant Detective",
    titleZh: "植物侦探社",
    icon: "🌱",
    accent: "#4d8a5f",
    eyebrow: "Sprout · Grow · Bloom",
    description: "Follow a plant from a tiny seed to a flower visited by a busy bee.",
    descriptionZh: "跟着植物从小小种子长成花朵，再观察忙碌的蜜蜂。",
    itemIds: ["seed", "root", "stem", "leaf", "sunflower", "dandelion", "germination", "pollination"],
    challenge: {
      prompt: "A bee carries pollen from one flower to another. Which process is this?",
      promptZh: "蜜蜂把花粉从一朵花带到另一朵花。这个过程叫什么？",
      options: [
        { id: "pollination", label: "Pollination", labelZh: "授粉", icon: "🐝" },
        { id: "germination", label: "Germination", labelZh: "发芽", icon: "🌱" },
        { id: "camouflage", label: "Camouflage", labelZh: "伪装", icon: "🦎" },
      ],
      answerId: "pollination",
      success: "Brilliant! Bees can help with pollination.",
      successZh: "太棒了！蜜蜂可以帮助植物授粉。",
    },
  },
  ...MARKET_WEATHER_SCENES,
  ...TRANSPORT_BODY_SCENES,
  ...HOME_SCHOOL_PLAY_SCENES,
] as const;

export const EVERYDAY_DISCOVERY_ITEMS: readonly EverydayDiscoveryItem[] = [
  item({
    id: "onion",
    sceneId: "kitchen",
    word: "onion",
    wordZh: "洋葱",
    chunks: [
      { id: "on", text: "on", cue: "UN", stressed: true },
      { id: "ion", text: "ion", cue: "yun", stressed: false },
    ],
    pronunciation: "UN · yun",
    ipa: "/ˈʌnjən/",
    description: [
      "An onion is a vegetable with many layers.",
      "It grows as a bulb under the soil.",
      "Cutting an onion can make your eyes water.",
    ],
    descriptionZh: [
      "洋葱是一种有很多层的蔬菜。",
      "它以鳞茎的样子长在土壤下面。",
      "切洋葱可能会让你的眼睛流泪。",
    ],
    descriptionKeywords: [
      { word: "layers", zh: "一层层" },
      { word: "bulb", zh: "鳞茎" },
      { word: "soil", zh: "土壤" },
    ],
    discovery: "Look closely at a cut onion. Can you count its rings?",
    discoveryZh: "仔细看看切开的洋葱，你能数出多少圈？",
    soundTip: "The first part sounds like UN, not the word on.",
    soundTipZh: "开头听起来像 UN，不是单独的 on。",
    factSourceUrl: "https://www.britannica.com/plant/onion-plant",
  }),
  item({
    id: "carrot",
    sceneId: "kitchen",
    word: "carrot",
    wordZh: "胡萝卜",
    chunks: [
      { id: "car", text: "car", cue: "KAIR", stressed: true },
      { id: "rot", text: "rot", cue: "uht", stressed: false },
    ],
    pronunciation: "KAIR · uht",
    ipa: "/ˈkærət/",
    description: [
      "A carrot is a crunchy root vegetable.",
      "Carrots can be orange, purple, yellow or white.",
      "We can wash, slice and eat a carrot.",
    ],
    descriptionZh: [
      "胡萝卜是一种脆脆的根茎蔬菜。",
      "胡萝卜可以是橙色、紫色、黄色或白色。",
      "我们可以把胡萝卜洗净、切片再吃。",
    ],
    descriptionKeywords: [
      { word: "crunchy", zh: "脆脆的" },
      { word: "root", zh: "根" },
      { word: "slice", zh: "切片" },
    ],
    discovery: "The part we usually eat is the plant's thick root.",
    discoveryZh: "我们平时吃的部分，是植物粗粗的根。",
    soundTip: "Keep the second part light: KAIR-uht.",
    soundTipZh: "第二部分轻轻读：KAIR-uht。",
    factSourceUrl: "https://www.britannica.com/plant/carrot",
  }),
  item({
    id: "tomato",
    sceneId: "kitchen",
    word: "tomato",
    wordZh: "番茄",
    chunks: [
      { id: "to-1", text: "to", cue: "tuh", stressed: false },
      { id: "ma", text: "ma", cue: "MAY", stressed: true },
      { id: "to-2", text: "to", cue: "toh", stressed: false },
    ],
    pronunciation: "tuh · MAY · toh",
    ipa: "/təˈmeɪtoʊ/",
    description: [
      "A tomato is a soft, juicy fruit.",
      "It grows on a green plant.",
      "We can slice it for salad or cook it in sauce.",
    ],
    descriptionZh: [
      "番茄是一种柔软多汁的果实。",
      "它长在绿色的植株上。",
      "我们可以把它切进沙拉，也可以煮成酱汁。",
    ],
    descriptionKeywords: [
      { word: "juicy", zh: "多汁的" },
      { word: "salad", zh: "沙拉" },
      { word: "sauce", zh: "酱汁" },
    ],
    discovery: "A tomato is a fruit in science, even when we use it like a vegetable.",
    discoveryZh: "在科学分类里，番茄是果实，虽然做饭时常被当作蔬菜。",
    soundTip: "Aoede says tuh-MAY-toh. Singapore and British speakers often say tuh-MAH-toh; both are standard.",
    soundTipZh: "Aoede 读 tuh-MAY-toh；新加坡和英国也常读 tuh-MAH-toh，两种都标准。",
    factSourceUrl: "https://www.britannica.com/plant/tomato",
  }),
  item({
    id: "spatula",
    sceneId: "kitchen",
    word: "spatula",
    wordZh: "锅铲 / 刮刀",
    chunks: [
      { id: "spat", text: "spat", cue: "SPATCH", stressed: true },
      { id: "u", text: "u", cue: "uh", stressed: false },
      { id: "la", text: "la", cue: "luh", stressed: false },
    ],
    pronunciation: "SPATCH · uh · luh",
    ipa: "/ˈspætʃələ/",
    description: [
      "A spatula is a kitchen tool with a flat end.",
      "It can lift or turn food in a pan.",
      "A soft spatula can also scrape a mixing bowl.",
    ],
    descriptionZh: [
      "spatula 是一种末端扁平的厨房工具。",
      "它可以把锅里的食物铲起或翻面。",
      "柔软的刮刀也可以刮干净搅拌碗。",
    ],
    descriptionKeywords: [
      { word: "tool", zh: "工具" },
      { word: "flat", zh: "扁平的" },
      { word: "scrape", zh: "刮" },
    ],
    discovery: "Different spatulas are made for flipping, spreading or scraping.",
    discoveryZh: "不同锅铲和刮刀可以用来翻面、涂抹或刮取。",
    soundTip: "The first part sounds like SPATCH.",
    soundTipZh: "第一部分听起来像 SPATCH。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/spatula",
  }),
  item({
    id: "saucepan",
    sceneId: "kitchen",
    word: "saucepan",
    wordZh: "长柄小锅",
    chunks: [
      { id: "sauce", text: "sauce", cue: "SAWSS", stressed: true },
      { id: "pan", text: "pan", cue: "pan", stressed: false },
    ],
    pronunciation: "SAWSS · pan",
    ipa: "/ˈsɔːspæn/",
    description: [
      "A saucepan is a deep pan with one long handle.",
      "We can heat soup, milk or sauce in it.",
      "An adult puts it on the stove for cooking.",
    ],
    descriptionZh: [
      "saucepan 是一种有长柄的深锅。",
      "我们可以用它加热汤、牛奶或酱汁。",
      "大人会把它放在炉灶上做饭。",
    ],
    descriptionKeywords: [
      { word: "deep", zh: "深的" },
      { word: "handle", zh: "手柄" },
      { word: "heat", zh: "加热" },
    ],
    discovery: "The long handle helps an adult hold the pan safely.",
    discoveryZh: "长手柄方便大人安全地握住锅。",
    soundTip: "It is two familiar words joined together: sauce + pan.",
    soundTipZh: "它由两个熟悉的词连起来：sauce + pan。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/saucepan",
  }),
  item({
    id: "ingredient",
    sceneId: "kitchen",
    word: "ingredient",
    wordZh: "食材 / 原料",
    chunks: [
      { id: "in", text: "in", cue: "in", stressed: false },
      { id: "gre", text: "gre", cue: "GREE", stressed: true },
      { id: "di", text: "di", cue: "dee", stressed: false },
      { id: "ent", text: "ent", cue: "unt", stressed: false },
    ],
    pronunciation: "in · GREE · dee · unt",
    ipa: "/ɪnˈɡriːdiənt/",
    description: [
      "An ingredient is something used to make food.",
      "Flour and eggs can be ingredients in a cake.",
      "A recipe tells us which ingredients we need.",
    ],
    descriptionZh: [
      "ingredient 是制作食物时使用的一样东西。",
      "面粉和鸡蛋可以是蛋糕的原料。",
      "食谱会告诉我们需要哪些食材。",
    ],
    descriptionKeywords: [
      { word: "flour", zh: "面粉" },
      { word: "recipe", zh: "食谱" },
      { word: "need", zh: "需要" },
    ],
    discovery: "A simple dish can use only a few ingredients.",
    discoveryZh: "一道简单的菜可能只需要几种食材。",
    soundTip: "Make GREE the strongest part: in-GREE-dee-unt.",
    soundTipZh: "GREE 要读得最有力：in-GREE-dee-unt。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/ingredient",
  }),
  item({
    id: "slice",
    sceneId: "kitchen",
    word: "slice",
    wordZh: "切片",
    chunks: [{ id: "slice", text: "slice", cue: "SLYSS", stressed: true }],
    pronunciation: "SLYSS",
    ipa: "/slaɪs/",
    description: [
      "To slice means to cut food into flat pieces.",
      "We can slice a banana or a tomato.",
      "A child asks an adult before using a sharp knife.",
    ],
    descriptionZh: [
      "slice 表示把食物切成扁平的片。",
      "我们可以把香蕉或番茄切片。",
      "小朋友使用锋利的刀之前要先请大人帮忙。",
    ],
    descriptionKeywords: [
      { word: "cut", zh: "切" },
      { word: "flat", zh: "扁平的" },
      { word: "sharp", zh: "锋利的" },
    ],
    discovery: "Slices can be thick or thin.",
    discoveryZh: "切片可以很厚，也可以很薄。",
    soundTip: "The i says its name: SLYSS.",
    soundTipZh: "这里的 i 发字母本身的音：SLYSS。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/slice",
  }),
  item({
    id: "stir",
    sceneId: "kitchen",
    word: "stir",
    wordZh: "搅拌",
    chunks: [{ id: "stir", text: "stir", cue: "STUR", stressed: true }],
    pronunciation: "STUR",
    ipa: "/stɝː/",
    description: [
      "To stir means to move a spoon around and around.",
      "Stirring mixes the ingredients together.",
      "We stir gently so the food stays in the bowl.",
    ],
    descriptionZh: [
      "stir 表示让勺子一圈一圈地转动。",
      "搅拌会把食材混合在一起。",
      "我们轻轻搅拌，食物就不会跑出碗。",
    ],
    descriptionKeywords: [
      { word: "around", zh: "转圈" },
      { word: "mix", zh: "混合" },
      { word: "gently", zh: "轻轻地" },
    ],
    discovery: "Try stirring clockwise, then anticlockwise.",
    discoveryZh: "试着顺时针搅一搅，再逆时针搅一搅。",
    soundTip: "Hold the r sound at the end: STUR.",
    soundTipZh: "结尾的 r 音要读清楚：STUR。",
    factSourceUrl: "https://www.merriam-webster.com/dictionary/stir",
  }),
  item({
    id: "rabbit",
    sceneId: "animals",
    word: "rabbit",
    wordZh: "兔子",
    chunks: [
      { id: "rab", text: "rab", cue: "RAB", stressed: true },
      { id: "bit", text: "bit", cue: "it", stressed: false },
    ],
    pronunciation: "RAB · it",
    ipa: "/ˈræbɪt/",
    description: [
      "A rabbit has long ears and powerful back legs.",
      "It moves quickly by hopping.",
      "Wild rabbits eat grasses and other plants.",
    ],
    descriptionZh: [
      "兔子有长耳朵和有力的后腿。",
      "它通过跳跃快速移动。",
      "野兔吃草和其他植物。",
    ],
    descriptionKeywords: [
      { word: "ears", zh: "耳朵" },
      { word: "hopping", zh: "跳跃" },
      { word: "grasses", zh: "草" },
    ],
    discovery: "A rabbit's eyes sit on the sides of its head, helping it look around.",
    discoveryZh: "兔子的眼睛长在头部两侧，方便观察四周。",
    soundTip: "Say the first part strongly: RAB-it.",
    soundTipZh: "第一部分读得有力：RAB-it。",
    factSourceUrl: "https://www.britannica.com/animal/rabbit",
  }),
  item({
    id: "squirrel",
    sceneId: "animals",
    word: "squirrel",
    wordZh: "松鼠",
    chunks: [
      { id: "squir", text: "squir", cue: "SKWUR", stressed: true },
      { id: "rel", text: "rel", cue: "uhl", stressed: false },
    ],
    pronunciation: "SKWUR · uhl",
    ipa: "/ˈskwɝːəl/",
    description: [
      "A squirrel is a small animal with a bushy tail.",
      "Many squirrels climb trees very well.",
      "They eat foods such as seeds, nuts and fruit.",
    ],
    descriptionZh: [
      "松鼠是一种有蓬松尾巴的小动物。",
      "许多松鼠都很会爬树。",
      "它们吃种子、坚果和果实等食物。",
    ],
    descriptionKeywords: [
      { word: "bushy", zh: "蓬松的" },
      { word: "climb", zh: "攀爬" },
      { word: "nuts", zh: "坚果" },
    ],
    discovery: "A squirrel can use its tail for balance and warmth.",
    discoveryZh: "松鼠可以用尾巴保持平衡，也可以保暖。",
    soundTip: "Start with three sounds close together: s-k-w.",
    soundTipZh: "开头把 s、k、w 三个音连在一起。",
    factSourceUrl: "https://www.britannica.com/animal/squirrel",
  }),
  item({
    id: "penguin",
    sceneId: "animals",
    word: "penguin",
    wordZh: "企鹅",
    chunks: [
      { id: "pen", text: "pen", cue: "PENG", stressed: true },
      { id: "guin", text: "guin", cue: "gwin", stressed: false },
    ],
    pronunciation: "PENG · gwin",
    ipa: "/ˈpɛŋɡwɪn/",
    description: [
      "A penguin is a bird that cannot fly in the air.",
      "Its flippers help it swim through the water.",
      "Different penguins live in different places in the Southern Hemisphere.",
    ],
    descriptionZh: [
      "企鹅是一种不能在空中飞翔的鸟。",
      "它的鳍状翅帮助它在水中游泳。",
      "不同种类的企鹅生活在南半球的不同地方。",
    ],
    descriptionKeywords: [
      { word: "bird", zh: "鸟" },
      { word: "flippers", zh: "鳍状翅" },
      { word: "Southern", zh: "南方的" },
    ],
    discovery: "Not every penguin lives on ice; some live near beaches and grasslands.",
    discoveryZh: "不是所有企鹅都住在冰上，有些住在海滩或草地附近。",
    soundTip: "The middle joins into a quick g-w sound: PENG-gwin.",
    soundTipZh: "中间把 g 和 w 快速连起来：PENG-gwin。",
    factSourceUrl: "https://www.britannica.com/animal/penguin",
  }),
  item({
    id: "crocodile",
    sceneId: "animals",
    word: "crocodile",
    wordZh: "鳄鱼",
    chunks: [
      { id: "croc", text: "croc", cue: "KROK", stressed: true },
      { id: "o", text: "o", cue: "uh", stressed: false },
      { id: "dile", text: "dile", cue: "dyle", stressed: false },
    ],
    pronunciation: "KROK · uh · dyle",
    ipa: "/ˈkrɑːkədaɪl/",
    description: [
      "A crocodile is a large reptile with a long snout.",
      "It has strong jaws and many sharp teeth.",
      "Crocodiles spend time in water and on land.",
    ],
    descriptionZh: [
      "鳄鱼是一种有长吻的大型爬行动物。",
      "它有强壮的颌和许多锋利的牙齿。",
      "鳄鱼既会待在水里，也会来到陆地上。",
    ],
    descriptionKeywords: [
      { word: "reptile", zh: "爬行动物" },
      { word: "snout", zh: "长吻" },
      { word: "jaws", zh: "颌" },
    ],
    discovery: "A crocodile can keep its eyes and nostrils above water while most of its body stays hidden.",
    discoveryZh: "鳄鱼能把眼睛和鼻孔露在水面上，同时把大部分身体藏在水下。",
    soundTip: "The last part sounds like dyle, rhyming with smile.",
    soundTipZh: "最后的 dyle 和 smile 押韵。",
    factSourceUrl: "https://www.britannica.com/animal/crocodile-order",
  }),
  item({
    id: "octopus",
    sceneId: "animals",
    word: "octopus",
    wordZh: "章鱼",
    chunks: [
      { id: "oc", text: "oc", cue: "OK", stressed: true },
      { id: "to", text: "to", cue: "tuh", stressed: false },
      { id: "pus", text: "pus", cue: "pus", stressed: false },
    ],
    pronunciation: "OK · tuh · pus",
    ipa: "/ˈɑːktəpəs/",
    description: [
      "An octopus is a sea animal with eight arms.",
      "Its soft body can squeeze through small spaces.",
      "Many octopuses can change colour to hide or communicate.",
    ],
    descriptionZh: [
      "章鱼是一种有八条腕的海洋动物。",
      "它柔软的身体可以挤过狭小空间。",
      "许多章鱼能改变颜色来隐藏自己或传递信息。",
    ],
    descriptionKeywords: [
      { word: "arms", zh: "腕" },
      { word: "squeeze", zh: "挤过" },
      { word: "communicate", zh: "传递信息" },
    ],
    discovery: "An octopus has three hearts.",
    discoveryZh: "章鱼有三颗心脏。",
    soundTip: "Keep all three parts crisp: OK-tuh-pus.",
    soundTipZh: "三个部分都读清楚：OK-tuh-pus。",
    factSourceUrl: "https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-other-cephalopods",
  }),
  item({
    id: "habitat",
    sceneId: "animals",
    word: "habitat",
    wordZh: "栖息地",
    chunks: [
      { id: "hab", text: "hab", cue: "HAB", stressed: true },
      { id: "i", text: "i", cue: "ih", stressed: false },
      { id: "tat", text: "tat", cue: "tat", stressed: false },
    ],
    pronunciation: "HAB · ih · tat",
    ipa: "/ˈhæbɪtæt/",
    description: [
      "A habitat is the natural home of a plant or animal.",
      "It provides things such as food, water and shelter.",
      "A pond, forest and coral reef are different habitats.",
    ],
    descriptionZh: [
      "habitat 是植物或动物的自然家园。",
      "它能提供食物、水和庇护等需要的东西。",
      "池塘、森林和珊瑚礁都是不同的栖息地。",
    ],
    descriptionKeywords: [
      { word: "natural", zh: "自然的" },
      { word: "shelter", zh: "庇护处" },
      { word: "reef", zh: "礁" },
    ],
    discovery: "One habitat can be home to many kinds of living things.",
    discoveryZh: "一个栖息地可以是许多种生物的家。",
    soundTip: "The first part is strongest: HAB-ih-tat.",
    soundTipZh: "第一部分最有力：HAB-ih-tat。",
    factSourceUrl: "https://education.nationalgeographic.org/resource/habitat/",
  }),
  item({
    id: "camouflage",
    sceneId: "animals",
    word: "camouflage",
    wordZh: "伪装",
    chunks: [
      { id: "cam", text: "cam", cue: "KAM", stressed: true },
      { id: "ou", text: "ou", cue: "uh", stressed: false },
      { id: "flage", text: "flage", cue: "flahzh", stressed: false },
    ],
    pronunciation: "KAM · uh · flahzh",
    ipa: "/ˈkæməflɑːʒ/",
    description: [
      "Camouflage helps a living thing blend into its surroundings.",
      "Colours, shapes or patterns can make an animal hard to see.",
      "Camouflage can help an animal hide from danger or sneak near food.",
    ],
    descriptionZh: [
      "伪装帮助生物融入周围环境。",
      "颜色、形状或花纹可以让动物很难被看见。",
      "伪装能帮助动物躲避危险，或悄悄接近食物。",
    ],
    descriptionKeywords: [
      { word: "blend", zh: "融入" },
      { word: "patterns", zh: "花纹" },
      { word: "danger", zh: "危险" },
    ],
    discovery: "Look for the animal's outline, eyes or shadow when its colours disappear into the background.",
    discoveryZh: "当动物颜色融进背景时，可以寻找它的轮廓、眼睛或影子。",
    soundTip: "The ending sounds like flahzh, with a soft zh sound.",
    soundTipZh: "结尾像 flahzh，用轻柔的 zh 音。",
    factSourceUrl: "https://education.nationalgeographic.org/resource/camouflage/",
  }),
  item({
    id: "nocturnal",
    sceneId: "animals",
    word: "nocturnal",
    wordZh: "夜行性的",
    chunks: [
      { id: "noc", text: "noc", cue: "nok", stressed: false },
      { id: "tur", text: "tur", cue: "TUR", stressed: true },
      { id: "nal", text: "nal", cue: "nuhl", stressed: false },
    ],
    pronunciation: "nok · TUR · nuhl",
    ipa: "/nɑːkˈtɝːnəl/",
    description: [
      "A nocturnal animal is active mainly at night.",
      "It usually rests during much of the day.",
      "Bats and many owls are nocturnal.",
    ],
    descriptionZh: [
      "夜行动物主要在夜晚活动。",
      "它通常在白天的大部分时间休息。",
      "蝙蝠和许多猫头鹰都是夜行性的。",
    ],
    descriptionKeywords: [
      { word: "active", zh: "活跃的" },
      { word: "night", zh: "夜晚" },
      { word: "rests", zh: "休息" },
    ],
    discovery: "Large eyes, sharp hearing or a strong sense of smell can help at night.",
    discoveryZh: "大眼睛、敏锐听觉或灵敏嗅觉，都能帮助动物在夜间活动。",
    soundTip: "Make TUR the strong middle beat: nok-TUR-nuhl.",
    soundTipZh: "中间的 TUR 最有力：nok-TUR-nuhl。",
    factSourceUrl: "https://www.britannica.com/science/nocturnality",
  }),
  item({
    id: "seed",
    sceneId: "plants",
    word: "seed",
    wordZh: "种子",
    chunks: [{ id: "seed", text: "seed", cue: "SEED", stressed: true }],
    pronunciation: "SEED",
    ipa: "/siːd/",
    description: [
      "A seed contains a tiny young plant.",
      "It also stores food to help the plant begin growing.",
      "Many seeds need water, air and warmth to sprout.",
    ],
    descriptionZh: [
      "一颗种子里面有一株很小的幼苗。",
      "它还储存食物，帮助植物开始生长。",
      "许多种子需要水、空气和温暖才能发芽。",
    ],
    descriptionKeywords: [
      { word: "contains", zh: "包含" },
      { word: "stores", zh: "储存" },
      { word: "sprout", zh: "发芽" },
    ],
    discovery: "A seed coat protects the young plant inside.",
    discoveryZh: "种皮会保护里面的幼苗。",
    soundTip: "The two e letters make one long ee sound.",
    soundTipZh: "两个 e 合在一起发长长的 ee 音。",
    factSourceUrl: "https://www.britannica.com/science/seed-plant-reproductive-part",
  }),
  item({
    id: "root",
    sceneId: "plants",
    word: "root",
    wordZh: "根",
    chunks: [{ id: "root", text: "root", cue: "ROOT", stressed: true }],
    pronunciation: "ROOT",
    ipa: "/ruːt/",
    description: [
      "A root usually grows down into the soil.",
      "It holds the plant in place.",
      "Roots take in water and minerals from the soil.",
    ],
    descriptionZh: [
      "根通常向下长进土壤。",
      "它把植物固定在原处。",
      "根从土壤中吸收水和矿物质。",
    ],
    descriptionKeywords: [
      { word: "soil", zh: "土壤" },
      { word: "holds", zh: "固定" },
      { word: "minerals", zh: "矿物质" },
    ],
    discovery: "Tiny root hairs help a root take in more water.",
    discoveryZh: "细小的根毛帮助根吸收更多水分。",
    soundTip: "Stretch the oo sound: ROOT.",
    soundTipZh: "把 oo 音拉长一点：ROOT。",
    factSourceUrl: "https://www.britannica.com/science/root-plant",
  }),
  item({
    id: "stem",
    sceneId: "plants",
    word: "stem",
    wordZh: "茎",
    chunks: [{ id: "stem", text: "stem", cue: "STEM", stressed: true }],
    pronunciation: "STEM",
    ipa: "/stɛm/",
    description: [
      "A stem helps hold a plant upright.",
      "It supports leaves, buds and flowers.",
      "The stem also carries water to different parts of the plant.",
    ],
    descriptionZh: [
      "茎帮助植物直立起来。",
      "它支撑叶子、花蕾和花朵。",
      "茎还把水输送到植物的不同部分。",
    ],
    descriptionKeywords: [
      { word: "upright", zh: "直立的" },
      { word: "supports", zh: "支撑" },
      { word: "carries", zh: "输送" },
    ],
    discovery: "Some stems are soft and green; others become hard, woody trunks.",
    discoveryZh: "有些茎柔软翠绿，有些会变成坚硬的木质树干。",
    soundTip: "Blend st together, then add em: STEM.",
    soundTipZh: "先把 st 连起来，再接 em：STEM。",
    factSourceUrl: "https://www.britannica.com/science/stem-plant",
  }),
  item({
    id: "leaf",
    sceneId: "plants",
    word: "leaf",
    wordZh: "叶子",
    chunks: [{ id: "leaf", text: "leaf", cue: "LEEF", stressed: true }],
    pronunciation: "LEEF",
    ipa: "/liːf/",
    description: [
      "A leaf is usually a flat, green part of a plant.",
      "It uses sunlight to help make food for the plant.",
      "Tiny openings in a leaf let gases move in and out.",
    ],
    descriptionZh: [
      "叶子通常是植物上扁平、绿色的部分。",
      "它利用阳光帮助植物制造食物。",
      "叶子上的小孔让气体进出。",
    ],
    descriptionKeywords: [
      { word: "flat", zh: "扁平的" },
      { word: "sunlight", zh: "阳光" },
      { word: "openings", zh: "小孔" },
    ],
    discovery: "Leaf veins carry water and help support the leaf.",
    discoveryZh: "叶脉输送水分，也帮助支撑叶片。",
    soundTip: "The ea letters make a long ee sound.",
    soundTipZh: "ea 在这里发长长的 ee 音。",
    factSourceUrl: "https://www.britannica.com/science/leaf-plant-anatomy",
  }),
  item({
    id: "sunflower",
    sceneId: "plants",
    word: "sunflower",
    wordZh: "向日葵",
    chunks: [
      { id: "sun", text: "sun", cue: "SUN", stressed: true },
      { id: "flow", text: "flow", cue: "FLOW", stressed: false },
      { id: "er", text: "er", cue: "er", stressed: false },
    ],
    pronunciation: "SUN · FLOW · er",
    ipa: "/ˈsʌnˌflaʊər/",
    description: [
      "A sunflower can grow a tall, strong stem.",
      "What looks like one flower is made of many tiny flowers.",
      "Young sunflower buds can turn to follow the sun across the sky.",
    ],
    descriptionZh: [
      "向日葵能长出高高、强壮的茎。",
      "看起来像一朵花的花盘，其实由许多小花组成。",
      "年轻的向日葵花蕾会转动，跟随太阳经过天空。",
    ],
    descriptionKeywords: [
      { word: "strong", zh: "强壮的" },
      { word: "tiny", zh: "很小的" },
      { word: "follow", zh: "跟随" },
    ],
    discovery: "After pollination, the flower head can make many sunflower seeds.",
    discoveryZh: "授粉之后，花盘可以结出许多葵花籽。",
    soundTip: "It is built from sun + flower.",
    soundTipZh: "它由 sun 和 flower 两个词组成。",
    factSourceUrl: "https://www.britannica.com/plant/sunflower-plant",
  }),
  item({
    id: "dandelion",
    sceneId: "plants",
    word: "dandelion",
    wordZh: "蒲公英",
    chunks: [
      { id: "dan", text: "dan", cue: "DAN", stressed: true },
      { id: "de", text: "de", cue: "duh", stressed: false },
      { id: "li", text: "li", cue: "lye", stressed: false },
      { id: "on", text: "on", cue: "un", stressed: false },
    ],
    pronunciation: "DAN · duh · lye · un",
    ipa: "/ˈdændəˌlaɪən/",
    description: [
      "A dandelion first has a bright yellow flower head.",
      "Later it forms a round head of tiny fruits with fluffy hairs.",
      "The wind can carry them to new places.",
    ],
    descriptionZh: [
      "蒲公英起初有一个鲜黄色的花头。",
      "后来它会形成圆圆的果实头，每个小果实都有绒毛。",
      "风可以把它们带到新的地方。",
    ],
    descriptionKeywords: [
      { word: "bright", zh: "鲜亮的" },
      { word: "fluffy", zh: "毛茸茸的" },
      { word: "carry", zh: "带走" },
    ],
    discovery: "The fluffy parts act like tiny parachutes.",
    discoveryZh: "绒毛像小小的降落伞。",
    soundTip: "Start strongly with DAN, then keep the other parts light.",
    soundTipZh: "DAN 读得最有力，后面几个部分轻一些。",
    factSourceUrl: "https://www.britannica.com/plant/dandelion",
  }),
  item({
    id: "germination",
    sceneId: "plants",
    word: "germination",
    wordZh: "发芽",
    chunks: [
      { id: "ger", text: "ger", cue: "jur", stressed: false },
      { id: "mi", text: "mi", cue: "muh", stressed: false },
      { id: "na", text: "na", cue: "NAY", stressed: true },
      { id: "tion", text: "tion", cue: "shun", stressed: false },
    ],
    pronunciation: "jur · muh · NAY · shun",
    ipa: "/ˌdʒɝːməˈneɪʃən/",
    description: [
      "Germination is when a seed begins to grow.",
      "The young root usually comes out first and grows downward.",
      "A shoot then grows upward toward the light.",
    ],
    descriptionZh: [
      "germination 是种子开始生长的过程。",
      "幼根通常先钻出来，向下生长。",
      "接着嫩芽向上朝着光生长。",
    ],
    descriptionKeywords: [
      { word: "begins", zh: "开始" },
      { word: "downward", zh: "向下" },
      { word: "shoot", zh: "嫩芽" },
    ],
    discovery: "You can watch a bean germinate beside a damp paper towel.",
    discoveryZh: "把豆子放在湿纸巾旁，就能观察它发芽。",
    soundTip: "Make NAY the strong beat: jur-muh-NAY-shun.",
    soundTipZh: "NAY 要读得最有力：jur-muh-NAY-shun。",
    factSourceUrl: "https://www.britannica.com/science/germination",
  }),
  item({
    id: "pollination",
    sceneId: "plants",
    word: "pollination",
    wordZh: "授粉",
    chunks: [
      { id: "pol", text: "pol", cue: "pol", stressed: false },
      { id: "li", text: "li", cue: "uh", stressed: false },
      { id: "na", text: "na", cue: "NAY", stressed: true },
      { id: "tion", text: "tion", cue: "shun", stressed: false },
    ],
    pronunciation: "pol · uh · NAY · shun",
    ipa: "/ˌpɑːləˈneɪʃən/",
    description: [
      "Pollination happens when pollen moves to the right part of a flower.",
      "Bees, other animals or the wind can carry pollen.",
      "Pollination helps many flowering plants make seeds and fruit.",
    ],
    descriptionZh: [
      "当花粉移动到花朵合适的部位时，就发生了授粉。",
      "蜜蜂、其他动物或风都可以搬运花粉。",
      "授粉帮助许多开花植物产生种子和果实。",
    ],
    descriptionKeywords: [
      { word: "pollen", zh: "花粉" },
      { word: "carry", zh: "搬运" },
      { word: "flowering", zh: "开花的" },
    ],
    discovery: "A bee can collect pollen on the hairs of its body while visiting flowers.",
    discoveryZh: "蜜蜂拜访花朵时，花粉会沾在它身上的绒毛上。",
    soundTip: "Make NAY the strong beat: pol-uh-NAY-shun.",
    soundTipZh: "NAY 要读得最有力：pol-uh-NAY-shun。",
    factSourceUrl: "https://www.britannica.com/science/pollination",
  }),
  ...MARKET_WEATHER_ITEMS,
  ...TRANSPORT_BODY_ITEMS,
  ...HOME_SCHOOL_PLAY_ITEMS,
];

export const EVERYDAY_DISCOVERY_LESSONS = EVERYDAY_DISCOVERY_ITEMS;

export function everydayDiscoveryItemById(id: EverydayDiscoveryId) {
  return EVERYDAY_DISCOVERY_ITEMS.find((candidate) => candidate.id === id);
}

export function everydayDiscoverySceneById(id: EverydayDiscoverySceneId) {
  return EVERYDAY_DISCOVERY_SCENES.find((candidate) => candidate.id === id);
}

export function everydayDiscoveryItemsForScene(sceneId: EverydayDiscoverySceneId) {
  return EVERYDAY_DISCOVERY_ITEMS.filter((candidate) => candidate.sceneId === sceneId);
}
