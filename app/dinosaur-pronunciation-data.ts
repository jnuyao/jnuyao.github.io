export const DINOSAUR_PRONUNCIATION_IDS = [
  "allosaurus",
  "spinosaurus",
  "triceratops",
  "suchomimus",
  "acrocanthosaurus",
  "cryolophosaurus",
  "tyrannosaurus",
  "velociraptor",
  "brachiosaurus",
  "stegosaurus",
  "ankylosaurus",
  "diplodocus",
  "parasaurolophus",
  "iguanodon",
  "carnotaurus",
  "pachycephalosaurus",
  "deinonychus",
  "apatosaurus",
  "giganotosaurus",
  "compsognathus",
] as const;

export type DinosaurPronunciationId =
  (typeof DINOSAUR_PRONUNCIATION_IDS)[number];

export type DinosaurPronunciationDifficulty = 1 | 2 | 3;

export type DinosaurPronunciationChunk = {
  id: string;
  /** The letters the child sees in the dinosaur name. */
  text: string;
  /** A child-friendly General American sound cue. */
  cue: string;
  /** Only the main-stress chunk is marked. */
  stressed: boolean;
};

export type DinosaurDescriptionKeyword = {
  word: string;
  zh: string;
};

export type DinosaurPronunciationImageCredit = {
  author: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
};

export type DinosaurPronunciationItem = {
  id: DinosaurPronunciationId;
  name: string;
  nameZh: string;
  imageSrc: string;
  difficulty: DinosaurPronunciationDifficulty;
  chunks: readonly DinosaurPronunciationChunk[];
  pronunciation: string;
  ipa: string;
  fact: string;
  factZh: string;
  description: readonly [string, string, string];
  descriptionZh: readonly [string, string, string];
  descriptionKeywords: readonly [
    DinosaurDescriptionKeyword,
    DinosaurDescriptionKeyword,
    DinosaurDescriptionKeyword,
  ];
  soundTip: string;
  soundTipZh: string;
  nameAudioSrc: string;
  coachAudioSrc: string;
  descriptionAudioSrc: string;
  coachScript: string;
  imageSourceUrl: string;
  factSourceUrl: string;
};

const IMAGE_ROOT = "/dinosaur-pronunciation";
const AUDIO_ROOT = "/dinosaur-pronunciation-audio";
const ABCMOUSE_IMAGE_ROOT =
  "https://www.abcmouse.com/learn/wp-content/uploads";
const NHM_DINOSAUR_ROOT =
  "https://www.nhm.ac.uk/discover/dino-directory";

export const DINOSAUR_PRONUNCIATION_IMAGE_CREDITS = {
  allosaurus: {
    author: "Fred Wierum",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Allosaurus_Revised.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  suchomimus: {
    author: "Connor Ashbridge",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Life_reconstruction_of_Suchomimus_tenerensis.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  acrocanthosaurus: {
    author: "Petr Menshikov",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Acrocanthosaurus_atokensis.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  cryolophosaurus: {
    author: "TotalDino",
    license: "CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Cryolophosaurus_TD.png",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  tyrannosaurus: {
    author: "Kathleen A. Ritterbush",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Tyrannosaurus_rex_illustration_by_Ritterbush.svg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  velociraptor: {
    author: "Fred Wierum",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Velociraptor_Restoration.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  brachiosaurus: {
    author: "Dmitry Bogdanov",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Brachiosaurus_DB.jpg",
    licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Public_domain",
  },
  stegosaurus: {
    author: "TotalDino",
    license: "CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Stegosaurus_TD.png",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  ankylosaurus: {
    author: "Mariana Ruiz Villarreal (LadyofHats)",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Ankylosaurus_dinosaur.png",
    licenseUrl: "https://commons.wikimedia.org/wiki/Commons:Public_domain",
  },
  diplodocus: {
    author: "TotalDino",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Diplodocus_TD.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  parasaurolophus: {
    author: "Connor Ashbridge",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Life_reconstruction_of_Parasaurolophus_walkeri.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  iguanodon: {
    author: "TotalDino",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Iguanodon_TD.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  carnotaurus: {
    author: "Fred Wierum",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Carnotaurus_Reconstruction_(2022).png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  pachycephalosaurus: {
    author: "Fred Wierum",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pachycephalosaurus_Reconstruction_transparent.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  deinonychus: {
    author: "Fred Wierum",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Deinonychus_Restoration.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  apatosaurus: {
    author: "Connor Ashbridge",
    license: "CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Apatosaurus_louisae.png",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  giganotosaurus: {
    author: "チャンネルD - ChDinosaurs",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Giganotosaurus_carolinii_colored_pencil_drawing.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  compsognathus: {
    author: "Conty",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Compsognathus_Conty.png",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
} as const satisfies Partial<Record<DinosaurPronunciationId, DinosaurPronunciationImageCredit>>;

export function dinosaurPronunciationImageCreditById(
  id: DinosaurPronunciationId,
): DinosaurPronunciationImageCredit | undefined {
  return (DINOSAUR_PRONUNCIATION_IMAGE_CREDITS as Partial<
    Record<DinosaurPronunciationId, DinosaurPronunciationImageCredit>
  >)[id];
}

function audioSources(id: DinosaurPronunciationId) {
  return {
    nameAudioSrc: `${AUDIO_ROOT}/${id}/whole.mp3`,
    coachAudioSrc: `${AUDIO_ROOT}/${id}/coach.mp3`,
    descriptionAudioSrc: `${AUDIO_ROOT}/${id}/description.mp3`,
  };
}

export const DINOSAUR_PRONUNCIATION_ITEMS: readonly DinosaurPronunciationItem[] = [
  {
    id: "allosaurus",
    name: "Allosaurus",
    nameZh: "异特龙",
    imageSrc: `${IMAGE_ROOT}/allosaurus.jpg`,
    difficulty: 1,
    chunks: [
      { id: "al", text: "Al", cue: "AL", stressed: false },
      { id: "lo", text: "lo", cue: "uh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "AL · uh · SORE · us",
    ipa: "/ˌæləˈsɔrəs/",
    fact: "It had three-fingered hands and small horns above its eyes.",
    factZh: "它的手有三根手指，眼睛上方还有小角。",
    description: [
      "Allosaurus had three-fingered hands and small horns above its eyes.",
      "It was a meat-eater that walked on two strong legs.",
      "It lived in what is now the USA during the Late Jurassic Period.",
    ],
    descriptionZh: [
      "异特龙的双手各有三根手指，眼睛上方长着小角。",
      "它是一种食肉恐龙，用两条强壮的后腿行走。",
      "它生活在晚侏罗世时期，也就是今天的美国一带。",
    ],
    descriptionKeywords: [
      { word: "horns", zh: "角" },
      { word: "meat-eater", zh: "食肉动物" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip: "The ending -saurus sounds like SORE-us.",
    soundTipZh: "结尾 -saurus 读作 SORE-us。",
    ...audioSources("allosaurus"),
    coachScript:
      "Listen, then say each part: AL. uh. SORE. us. Now blend it: AL-uh-SORE-us. Allosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.allosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/allosaurus.html`,
  },
  {
    id: "spinosaurus",
    name: "Spinosaurus",
    nameZh: "棘龙",
    imageSrc: `${IMAGE_ROOT}/spinosaurus.jpg`,
    difficulty: 1,
    chunks: [
      { id: "spi", text: "Spi", cue: "SPY", stressed: false },
      { id: "no", text: "no", cue: "noh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "SPY · noh · SORE · us",
    ipa: "/ˌspaɪnoʊˈsɔrəs/",
    fact: "It ate fish and may have spent part of its time in water.",
    factZh: "它会吃鱼，并且可能常在水中活动。",
    description: [
      "Spinosaurus had a long snout and tall spines along its back.",
      "It ate fish, and scientists think it may have spent time in water.",
      "It lived in North Africa during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "棘龙有细长的嘴，背上长着高高的棘刺。",
      "它会吃鱼；科学家认为它可能常在水中活动。",
      "它生活在晚白垩世时期的北非。",
    ],
    descriptionKeywords: [
      { word: "spines", zh: "棘刺" },
      { word: "fish", zh: "鱼" },
      { word: "Africa", zh: "非洲" },
    ],
    soundTip: "Say SPY, then add noh-SORE-us.",
    soundTipZh: "先读 SPY，再接 noh-SORE-us。",
    ...audioSources("spinosaurus"),
    coachScript:
      "Listen, then say each part: SPY. noh. SORE. us. Now blend it: SPY-noh-SORE-us. Spinosaurus.",
    imageSourceUrl: `${ABCMOUSE_IMAGE_ROOT}/2025/12/spinosaurus-dinosaur-names.jpg`,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/spinosaurus.html`,
  },
  {
    id: "triceratops",
    name: "Triceratops",
    nameZh: "三角龙",
    imageSrc: `${IMAGE_ROOT}/triceratops.jpg`,
    difficulty: 2,
    chunks: [
      { id: "tri", text: "Tri", cue: "try", stressed: false },
      { id: "cer", text: "cer", cue: "SERR", stressed: true },
      { id: "a", text: "a", cue: "uh", stressed: false },
      { id: "tops", text: "tops", cue: "tops", stressed: false },
    ],
    pronunciation: "try · SERR · uh · tops",
    ipa: "/ˌtraɪˈsɛrətɑps/",
    fact: "It was a plant-eater with three horns and a large frill.",
    factZh: "它是食草恐龙，有三只角和一块大颈盾。",
    description: [
      "Triceratops had three horns, a parrot-like beak, and a large frill.",
      "It ate tough plants and walked on four legs.",
      "It lived in what is now the USA near the end of the Cretaceous Period.",
    ],
    descriptionZh: [
      "三角龙有三只角、鹦鹉一样的喙和一块大颈盾。",
      "它吃坚韧的植物，用四条腿行走。",
      "它生活在白垩纪末期，也就是今天的美国一带。",
    ],
    descriptionKeywords: [
      { word: "horns", zh: "角" },
      { word: "plants", zh: "植物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip: "Tri sounds like try. The c in cer sounds like s.",
    soundTipZh: "Tri 和 try 同音；cer 里的 c 发 /s/。",
    ...audioSources("triceratops"),
    coachScript:
      "Listen, then say each part: try. SERR. uh. tops. Now blend it: try-SERR-uh-tops. Triceratops.",
    imageSourceUrl: `${ABCMOUSE_IMAGE_ROOT}/2025/12/triceratops-dinosaur-names.jpg`,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/triceratops.html`,
  },
  {
    id: "suchomimus",
    name: "Suchomimus",
    nameZh: "似鳄龙",
    imageSrc: `${IMAGE_ROOT}/suchomimus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "su", text: "Su", cue: "SOO", stressed: false },
      { id: "cho", text: "cho", cue: "koh", stressed: false },
      { id: "mi", text: "mi", cue: "MY", stressed: true },
      { id: "mus", text: "mus", cue: "muss", stressed: false },
    ],
    pronunciation: "SOO · koh · MY · muss",
    ipa: "/ˌsuːkoʊˈmaɪməs/",
    fact: "Its name means ‘crocodile mimic’.",
    factZh: "它的名字意思是“鳄鱼模仿者”。",
    description: [
      "Suchomimus was a large meat-eating dinosaur.",
      "Its name means crocodile mimic, and it was similar to Spinosaurus.",
      "It lived in Niger during the Early Cretaceous Period.",
    ],
    descriptionZh: [
      "似鳄龙是一种大型食肉恐龙。",
      "它的名字意思是“鳄鱼模仿者”，外形与棘龙相似。",
      "它生活在早白垩世时期的尼日尔。",
    ],
    descriptionKeywords: [
      { word: "crocodile", zh: "鳄鱼" },
      { word: "meat-eating", zh: "食肉的" },
      { word: "Niger", zh: "尼日尔" },
    ],
    soundTip: "The ch makes a k sound. Mi sounds like my.",
    soundTipZh: "这里的 ch 发 /k/；mi 读成 my。",
    ...audioSources("suchomimus"),
    coachScript:
      "Listen, then say each part: SOO. koh. MY. muss. Now blend it: SOO-koh-MY-muss. Suchomimus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.suchomimus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/suchomimus.html`,
  },
  {
    id: "acrocanthosaurus",
    name: "Acrocanthosaurus",
    nameZh: "高棘龙",
    imageSrc: `${IMAGE_ROOT}/acrocanthosaurus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "ac", text: "Ac", cue: "AK", stressed: false },
      { id: "ro", text: "ro", cue: "roh", stressed: false },
      { id: "can", text: "can", cue: "KAN", stressed: false },
      { id: "tho", text: "tho", cue: "thoh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "AK · roh · KAN · thoh · SORE · us",
    ipa: "/ˌækroʊˌkænθoʊˈsɔrəs/",
    fact: "Its name means ‘high-spined lizard’.",
    factZh: "它的名字意思是“高脊蜥蜴”。",
    description: [
      "Acrocanthosaurus had tall spines along its back.",
      "It was a large meat-eater, about twelve metres long.",
      "It lived in what is now the USA during the Early Cretaceous Period.",
    ],
    descriptionZh: [
      "高棘龙的背部长着高高的棘刺。",
      "它是一种大型食肉恐龙，身长大约十二米。",
      "它生活在早白垩世时期，也就是今天的美国一带。",
    ],
    descriptionKeywords: [
      { word: "spines", zh: "棘刺" },
      { word: "meat-eater", zh: "食肉动物" },
      { word: "USA", zh: "美国" },
    ],
    soundTip: "Keep the th sound gentle, then finish with SORE-us.",
    soundTipZh: "轻轻发出 th，再用 SORE-us 收尾。",
    ...audioSources("acrocanthosaurus"),
    coachScript:
      "Listen, then say each part: AK. roh. KAN. thoh. SORE. us. Now blend it: AK-roh-KAN-thoh-SORE-us. Acrocanthosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.acrocanthosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/acrocanthosaurus.html`,
  },
  {
    id: "cryolophosaurus",
    name: "Cryolophosaurus",
    nameZh: "冰脊龙",
    imageSrc: `${IMAGE_ROOT}/cryolophosaurus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "cry", text: "Cry", cue: "CRY", stressed: false },
      { id: "o", text: "o", cue: "oh", stressed: false },
      { id: "lo", text: "lo", cue: "LOAF", stressed: false },
      { id: "pho", text: "pho", cue: "oh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "CRY · oh · LOAF · oh · SORE · us",
    ipa: "/ˌkraɪoʊˌloʊfoʊˈsɔrəs/",
    fact: "It lived in Antarctica and had a small curved crest.",
    factZh: "它生活在南极洲，头顶有一块弯曲的小冠。",
    description: [
      "Cryolophosaurus had a small curved crest on top of its head.",
      "It was a meat-eater that walked on two legs.",
      "It lived in Antarctica during the Early Jurassic Period.",
    ],
    descriptionZh: [
      "冰脊龙的头顶有一块弯曲的小冠。",
      "它是一种用两条腿行走的食肉恐龙。",
      "它生活在早侏罗世时期的南极洲。",
    ],
    descriptionKeywords: [
      { word: "crest", zh: "头冠" },
      { word: "meat-eater", zh: "食肉动物" },
      { word: "Antarctica", zh: "南极洲" },
    ],
    soundTip: "Build three little parts: CRY-oh, LOAF-oh, SORE-us.",
    soundTipZh: "分成三组：CRY-oh、LOAF-oh、SORE-us。",
    ...audioSources("cryolophosaurus"),
    coachScript:
      "Listen, then say each part: CRY. oh. LOAF. oh. SORE. us. Now blend it: CRY-oh-LOAF-oh-SORE-us. Cryolophosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.cryolophosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/cryolophosaurus.html`,
  },
  {
    id: "tyrannosaurus",
    name: "Tyrannosaurus rex",
    nameZh: "霸王龙",
    imageSrc: `${IMAGE_ROOT}/tyrannosaurus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "ty", text: "Ty", cue: "tih", stressed: false },
      { id: "ran", text: "ran", cue: "ran", stressed: false },
      { id: "no", text: "no", cue: "uh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
      { id: "rex", text: " rex", cue: "rex", stressed: false },
    ],
    pronunciation: "tih · ran · uh · SORE · us · rex",
    ipa: "/tɪˌrænəˈsɔrəs rɛks/",
    fact: "It had about 60 sharp, bone-crushing teeth.",
    factZh: "它大约有60颗锋利、能咬碎骨头的牙齿。",
    description: [
      "Tyrannosaurus had a huge head, powerful jaws, and very small arms.",
      "It ate other animals and walked on two strong legs.",
      "It lived in Canada and the USA near the end of the Cretaceous Period.",
    ],
    descriptionZh: [
      "霸王龙有巨大的头、强有力的上下颌和很小的前肢。",
      "它捕食其他动物，用两条强壮的后腿行走。",
      "它生活在白垩纪末期，也就是今天的加拿大和美国一带。",
    ],
    descriptionKeywords: [
      { word: "jaws", zh: "上下颌" },
      { word: "animals", zh: "动物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip:
      "Use tih-ran-uh-SORE-us rex here; tie-RAN-uh-SORE-us is also common. Keep SORE strongest.",
    soundTipZh:
      "本站读作 tih-ran-uh-SORE-us rex；tie-RAN-uh-SORE-us 也很常见。SORE 要读得最重。",
    ...audioSources("tyrannosaurus"),
    coachScript:
      "Listen, then say each part: tih. ran. uh. SORE. us. rex. Now blend it: tih-ran-uh-SORE-us rex. Tyrannosaurus rex.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.tyrannosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/tyrannosaurus.html`,
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    nameZh: "伶盗龙（迅猛龙）",
    imageSrc: `${IMAGE_ROOT}/velociraptor.jpg`,
    difficulty: 2,
    chunks: [
      { id: "ve", text: "Ve", cue: "vuh", stressed: false },
      { id: "lo", text: "lo", cue: "LAH", stressed: true },
      { id: "ci", text: "ci", cue: "sih", stressed: false },
      { id: "rap", text: "rap", cue: "rap", stressed: false },
      { id: "tor", text: "tor", cue: "ter", stressed: false },
    ],
    pronunciation: "vuh · LAH · sih · rap · ter",
    ipa: "/vəˈlɑsɪˌræptər/",
    fact: "It was a small meat-eater with sharp teeth and a large curved claw on each foot.",
    factZh: "它是一种小型食肉恐龙，牙齿锋利，每只脚上还有一根弯曲的大爪。",
    description: [
      "Velociraptor was small and probably had a fine covering of feathers.",
      "It ate other animals and ran on two legs.",
      "It lived in Mongolia during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "伶盗龙体型较小，身上很可能覆盖着细密的羽毛。",
      "它捕食其他动物，用两条腿奔跑。",
      "它生活在晚白垩世时期的蒙古。",
    ],
    descriptionKeywords: [
      { word: "feathers", zh: "羽毛" },
      { word: "animals", zh: "动物" },
      { word: "Mongolia", zh: "蒙古" },
    ],
    soundTip: "The c sounds like s. Make LAH strongest: vuh-LAH-sih-rap-ter.",
    soundTipZh: "这里的 c 发 /s/；LAH 要读得最重：vuh-LAH-sih-rap-ter。",
    ...audioSources("velociraptor"),
    coachScript:
      "Listen, then say each part: vuh. LAH. sih. rap. ter. Now blend it: vuh-LAH-sih-rap-ter. Velociraptor.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.velociraptor.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/velociraptor.html`,
  },
  {
    id: "brachiosaurus",
    name: "Brachiosaurus",
    nameZh: "腕龙",
    imageSrc: `${IMAGE_ROOT}/brachiosaurus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "brach", text: "Brach", cue: "BRAK", stressed: false },
      { id: "i", text: "i", cue: "ee", stressed: false },
      { id: "o", text: "o", cue: "uh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "BRAK · ee · uh · SORE · us",
    ipa: "/ˌbrækiəˈsɔrəs/",
    fact: "Its long neck helped it reach leaves high in trees.",
    factZh: "它的长脖子帮助它够到高处树叶。",
    description: [
      "Brachiosaurus had a long neck and longer front legs.",
      "It ate leaves from tall trees and walked on four legs.",
      "It lived in the USA during the Late Jurassic Period.",
    ],
    descriptionZh: [
      "腕龙有长脖子，而且前腿比后腿长。",
      "它吃高大树木上的叶子，用四条腿行走。",
      "它生活在晚侏罗世时期的美国。",
    ],
    descriptionKeywords: [
      { word: "neck", zh: "脖子" },
      { word: "leaves", zh: "树叶" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip: "Brach sounds like BRAK. Keep SORE strongest at the end.",
    soundTipZh: "Brach 读作 BRAK；结尾的 SORE 要读得最重。",
    ...audioSources("brachiosaurus"),
    coachScript:
      "Listen, then say each part: BRAK. ee. uh. SORE. us. Now blend it: BRAK-ee-uh-SORE-us. Brachiosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.brachiosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/brachiosaurus.html`,
  },
  {
    id: "stegosaurus",
    name: "Stegosaurus",
    nameZh: "剑龙",
    imageSrc: `${IMAGE_ROOT}/stegosaurus.jpg`,
    difficulty: 1,
    chunks: [
      { id: "steg", text: "Steg", cue: "STEG", stressed: false },
      { id: "o", text: "o", cue: "uh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "STEG · uh · SORE · us",
    ipa: "/ˌstɛɡəˈsɔrəs/",
    fact: "It had bony back plates and a powerful tail tipped with spikes.",
    factZh: "它背上有骨质板，强壮的尾巴末端长着尖刺。",
    description: [
      "Stegosaurus had two rows of tall plates and a powerful spiked tail.",
      "It ate plants and moved on four legs.",
      "It lived in the USA during the Late Jurassic Period.",
    ],
    descriptionZh: [
      "剑龙背上有两排高高的骨板，还有一条强壮的带刺尾巴。",
      "它吃植物，用四条腿行走。",
      "它生活在晚侏罗世时期的美国。",
    ],
    descriptionKeywords: [
      { word: "plates", zh: "骨板" },
      { word: "plants", zh: "植物" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip: "Steg rhymes with egg after st; finish with a strong SORE-us.",
    soundTipZh: "Steg 的 eg 与 egg 同音；结尾 SORE-us 要把 SORE 读重。",
    ...audioSources("stegosaurus"),
    coachScript:
      "Listen, then say each part: STEG. uh. SORE. us. Now blend it: STEG-uh-SORE-us. Stegosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.stegosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/stegosaurus.html`,
  },
  {
    id: "ankylosaurus",
    name: "Ankylosaurus",
    nameZh: "甲龙",
    imageSrc: `${IMAGE_ROOT}/ankylosaurus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "an", text: "An", cue: "ANG", stressed: false },
      { id: "ky", text: "ky", cue: "kuh", stressed: false },
      { id: "lo", text: "lo", cue: "loh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "ANG · kuh · loh · SORE · us",
    ipa: "/ˌæŋkəloʊˈsɔrəs/",
    fact: "Bony plates protected its body, and a heavy club armed the end of its tail.",
    factZh: "骨板保护着它的身体，尾巴末端还有一个沉重的尾锤。",
    description: [
      "Ankylosaurus had bony armor over its body and a heavy tail club.",
      "It ate low plants and walked on four sturdy legs.",
      "It lived in Canada and the USA during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "甲龙全身覆盖着骨质铠甲，尾巴末端还有沉重的尾锤。",
      "它吃低矮植物，用四条结实的腿行走。",
      "它生活在晚白垩世时期的加拿大和美国。",
    ],
    descriptionKeywords: [
      { word: "armor", zh: "铠甲" },
      { word: "plants", zh: "植物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip:
      "Use ANG-kuh-loh here; some museums say an-KYE-loh. Both readings are used.",
    soundTipZh:
      "本站读作 ANG-kuh-loh；有些博物馆读 an-KYE-loh，两种读法都有人使用。",
    ...audioSources("ankylosaurus"),
    coachScript:
      "Listen, then say each part: ANG. kuh. loh. SORE. us. Now blend it: ANG-kuh-loh-SORE-us. Ankylosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.ankylosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/ankylosaurus.html`,
  },
  {
    id: "diplodocus",
    name: "Diplodocus",
    nameZh: "梁龙",
    imageSrc: `${IMAGE_ROOT}/diplodocus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "di", text: "Di", cue: "duh", stressed: false },
      { id: "plo", text: "plo", cue: "PLAH", stressed: true },
      { id: "do", text: "do", cue: "duh", stressed: false },
      { id: "cus", text: "cus", cue: "kus", stressed: false },
    ],
    pronunciation: "duh · PLAH · duh · kus",
    ipa: "/dəˈplɑdəkəs/",
    fact: "It had a long neck and a very long, whip-like tail.",
    factZh: "它有长脖子和一条很长、像鞭子一样的尾巴。",
    description: [
      "Diplodocus had a long neck and a very long, whip-like tail.",
      "It ate soft plants and walked on four legs.",
      "It lived in the USA during the Late Jurassic Period.",
    ],
    descriptionZh: [
      "梁龙有长脖子和一条很长、像鞭子一样的尾巴。",
      "它吃柔软的植物，用四条腿行走。",
      "它生活在晚侏罗世时期的美国。",
    ],
    descriptionKeywords: [
      { word: "neck", zh: "脖子" },
      { word: "plants", zh: "植物" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip:
      "Use duh-PLAH-duh-kus here; DIP-low-DOCK-us is another common museum reading.",
    soundTipZh:
      "本站采用美式 duh-PLAH-duh-kus；博物馆中也常听到 DIP-low-DOCK-us。",
    ...audioSources("diplodocus"),
    coachScript:
      "Listen, then say each part: duh. PLAH. duh. kus. Now blend it: duh-PLAH-duh-kus. Diplodocus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.diplodocus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/diplodocus.html`,
  },
  {
    id: "parasaurolophus",
    name: "Parasaurolophus",
    nameZh: "副栉龙",
    imageSrc: `${IMAGE_ROOT}/parasaurolophus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "pa", text: "Pa", cue: "PAIR", stressed: false },
      { id: "ra", text: "ra", cue: "uh", stressed: false },
      { id: "sau", text: "sau", cue: "sore", stressed: false },
      { id: "ro", text: "ro", cue: "uh", stressed: false },
      { id: "loph", text: "loph", cue: "LOAF", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "PAIR · uh · sore · uh · LOAF · us",
    ipa: "/ˌpɛrəˌsɔrəˈloʊfəs/",
    fact: "Scientists think its long hollow crest may have helped it make deep, trumpeting sounds.",
    factZh: "科学家认为，它细长的中空头冠可能帮助它发出低沉、像号角一样的声音。",
    description: [
      "Parasaurolophus had a duck-like bill and a long, hollow head crest.",
      "It ate plants and could walk on two or four legs.",
      "It lived in Canada and the USA during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "副栉龙有鸭嘴一样的喙和细长的中空头冠。",
      "它吃植物，可以用两条腿或四条腿行走。",
      "它生活在晚白垩世时期的加拿大和美国。",
    ],
    descriptionKeywords: [
      { word: "crest", zh: "头冠" },
      { word: "plants", zh: "植物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip:
      "Build PAIR-uh / sore-uh / LOAF-us, with LOAF strongest. Some museums instead stress ROL.",
    soundTipZh:
      "分成 PAIR-uh、sore-uh、LOAF-us 三组，LOAF 要读得最重；有些博物馆会改为重读 ROL。",
    ...audioSources("parasaurolophus"),
    coachScript:
      "Listen, then say each part: PAIR. uh. sore. uh. LOAF. us. Now blend it: PAIR-uh-sore-uh-LOAF-us. Parasaurolophus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.parasaurolophus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/parasaurolophus.html`,
  },
  {
    id: "iguanodon",
    name: "Iguanodon",
    nameZh: "禽龙",
    imageSrc: `${IMAGE_ROOT}/iguanodon.jpg`,
    difficulty: 2,
    chunks: [
      { id: "i", text: "I", cue: "ih", stressed: false },
      { id: "gua", text: "gua", cue: "GWAH", stressed: true },
      { id: "no", text: "no", cue: "nuh", stressed: false },
      { id: "don", text: "don", cue: "don", stressed: false },
    ],
    pronunciation: "ih · GWAH · nuh · don",
    ipa: "/ɪˈɡwɑnəˌdɑn/",
    fact: "It had a large thumb spike and could move on two or four legs.",
    factZh: "它有一根很大的拇指刺，可以用两条腿或四条腿移动。",
    description: [
      "Iguanodon had a beak, chewing teeth, and a large thumb spike.",
      "It ate plants and could walk on two or four legs.",
      "It lived in Europe during the Early Cretaceous Period.",
    ],
    descriptionZh: [
      "禽龙有喙、用于咀嚼的牙齿和一根很大的拇指刺。",
      "它吃植物，可以用两条腿或四条腿行走。",
      "它生活在早白垩世时期的欧洲。",
    ],
    descriptionKeywords: [
      { word: "spike", zh: "尖刺" },
      { word: "plants", zh: "植物" },
      { word: "Europe", zh: "欧洲" },
    ],
    soundTip: "Join g and ua into GWAH, the strongest beat: ih-GWAH-nuh-don.",
    soundTipZh: "把 g 和 ua 连成 GWAH，并把它读得最重：ih-GWAH-nuh-don。",
    ...audioSources("iguanodon"),
    coachScript:
      "Listen, then say each part: ih. GWAH. nuh. don. Now blend it: ih-GWAH-nuh-don. Iguanodon.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.iguanodon.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/iguanodon.html`,
  },
  {
    id: "carnotaurus",
    name: "Carnotaurus",
    nameZh: "食肉牛龙",
    imageSrc: `${IMAGE_ROOT}/carnotaurus.jpg`,
    difficulty: 1,
    chunks: [
      { id: "car", text: "Car", cue: "car", stressed: false },
      { id: "no", text: "no", cue: "noh", stressed: false },
      { id: "taur", text: "taur", cue: "TORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "car · noh · TORE · us",
    ipa: "/ˌkɑrnoʊˈtɔrəs/",
    fact: "It had two horns above its eyes and very small arms.",
    factZh: "它眼睛上方有两只角，前肢却非常小。",
    description: [
      "Carnotaurus had two horns, a short snout, and very small arms.",
      "It ate meat and walked on two legs.",
      "It lived in Argentina during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "食肉牛龙有两只角、短短的吻部和非常小的前肢。",
      "它吃肉，用两条腿行走。",
      "它生活在晚白垩世时期的阿根廷。",
    ],
    descriptionKeywords: [
      { word: "horns", zh: "角" },
      { word: "meat", zh: "肉" },
      { word: "Argentina", zh: "阿根廷" },
    ],
    soundTip: "Say car, then noh-TORE-us; TORE is the strongest beat.",
    soundTipZh: "先读 car，再接 noh-TORE-us；TORE 要读得最重。",
    ...audioSources("carnotaurus"),
    coachScript:
      "Listen, then say each part: car. noh. TORE. us. Now blend it: car-noh-TORE-us. Carnotaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.carnotaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/carnotaurus.html`,
  },
  {
    id: "pachycephalosaurus",
    name: "Pachycephalosaurus",
    nameZh: "厚头龙",
    imageSrc: `${IMAGE_ROOT}/pachycephalosaurus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "pach", text: "Pach", cue: "pak", stressed: false },
      { id: "y", text: "y", cue: "ee", stressed: false },
      { id: "ce", text: "ce", cue: "sef", stressed: false },
      { id: "pha", text: "pha", cue: "uh", stressed: false },
      { id: "lo", text: "lo", cue: "luh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "pak · ee · sef · uh · luh · SORE · us",
    ipa: "/ˌpækiˌsɛfələˈsɔrəs/",
    fact: "It had a thick bony head dome surrounded by bumps and spikes.",
    factZh: "它有厚厚的骨质头顶，周围长着凸起和尖刺。",
    description: [
      "Pachycephalosaurus had a large bony dome with bumps around its head.",
      "It probably ate plants and walked on two legs.",
      "It lived in Canada and the USA during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "厚头龙有一个很大的骨质头顶，头部周围还有凸起。",
      "它可能吃植物，用两条腿行走。",
      "它生活在晚白垩世时期的加拿大和美国。",
    ],
    descriptionKeywords: [
      { word: "dome", zh: "穹顶状头骨" },
      { word: "plants", zh: "植物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip:
      "The ph sounds like f; build pak-ee-sef-uh-luh, then stress SORE-us. Some museums stress KEF earlier.",
    soundTipZh:
      "ph 发 /f/；先读 pak-ee-sef-uh-luh，再重读 SORE-us。有些博物馆会在前面的 KEF 处加强重音。",
    ...audioSources("pachycephalosaurus"),
    coachScript:
      "Listen, then say each part: pak. ee. sef. uh. luh. SORE. us. Now blend it: pak-ee-sef-uh-luh-SORE-us. Pachycephalosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.pachycephalosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/pachycephalosaurus.html`,
  },
  {
    id: "deinonychus",
    name: "Deinonychus",
    nameZh: "恐爪龙",
    imageSrc: `${IMAGE_ROOT}/deinonychus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "dei", text: "Dei", cue: "dye", stressed: false },
      { id: "non", text: "non", cue: "NON", stressed: true },
      { id: "y", text: "y", cue: "ih", stressed: false },
      { id: "chus", text: "chus", cue: "kus", stressed: false },
    ],
    pronunciation: "dye · NON · ih · kus",
    ipa: "/ˌdaɪˈnɑnɪkəs/",
    fact: "It kept a large sickle-shaped toe claw off the ground when it was not using it.",
    factZh: "不用那根镰刀状的大脚爪时，它会把爪子抬离地面。",
    description: [
      "Deinonychus had a large, curved claw on the second toe of each foot.",
      "It ate other animals and walked on two legs.",
      "It lived in the USA during the Early Cretaceous Period.",
    ],
    descriptionZh: [
      "恐爪龙每只脚的第二根脚趾上都有一根弯曲的大爪。",
      "它捕食其他动物，用两条腿行走。",
      "它生活在早白垩世时期的美国。",
    ],
    descriptionKeywords: [
      { word: "claw", zh: "爪" },
      { word: "animals", zh: "动物" },
      { word: "Cretaceous", zh: "白垩纪" },
    ],
    soundTip:
      "The ch sounds like k. Use dye-NON-ih-kus here; dye-NAH-nih-kus is also used.",
    soundTipZh:
      "这里的 ch 发 /k/。本站读 dye-NON-ih-kus；dye-NAH-nih-kus 也有人使用。",
    ...audioSources("deinonychus"),
    coachScript:
      "Listen, then say each part: dye. NON. ih. kus. Now blend it: dye-NON-ih-kus. Deinonychus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.deinonychus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/deinonychus.html`,
  },
  {
    id: "apatosaurus",
    name: "Apatosaurus",
    nameZh: "迷惑龙",
    imageSrc: `${IMAGE_ROOT}/apatosaurus.jpg`,
    difficulty: 2,
    chunks: [
      { id: "a", text: "A", cue: "uh", stressed: false },
      { id: "pat", text: "pat", cue: "PAT", stressed: false },
      { id: "o", text: "o", cue: "uh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "uh · PAT · uh · SORE · us",
    ipa: "/əˌpætəˈsɔrəs/",
    fact: "It was a giant plant-eater with a long neck and a long, narrow tail.",
    factZh: "它是巨大的食草恐龙，有长脖子和一条细长的尾巴。",
    description: [
      "Apatosaurus had a long neck, a huge body, and a long, narrow tail.",
      "It ate plants and walked on four strong legs.",
      "It lived in North America during the Late Jurassic Period.",
    ],
    descriptionZh: [
      "迷惑龙有长脖子、巨大的身体和一条细长的尾巴。",
      "它吃植物，用四条强壮的腿行走。",
      "它生活在晚侏罗世时期的北美洲。",
    ],
    descriptionKeywords: [
      { word: "neck", zh: "脖子" },
      { word: "plants", zh: "植物" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip: "Say uh-PAT-uh, then put the strongest beat on SORE-us.",
    soundTipZh: "先读 uh-PAT-uh，再把最重的一拍放在 SORE-us 的 SORE 上。",
    ...audioSources("apatosaurus"),
    coachScript:
      "Listen, then say each part: uh. PAT. uh. SORE. us. Now blend it: uh-PAT-uh-SORE-us. Apatosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.apatosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/apatosaurus.html`,
  },
  {
    id: "giganotosaurus",
    name: "Giganotosaurus",
    nameZh: "南方巨兽龙",
    imageSrc: `${IMAGE_ROOT}/giganotosaurus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "gig", text: "Gig", cue: "GIG", stressed: false },
      { id: "a", text: "a", cue: "uh", stressed: false },
      { id: "no", text: "no", cue: "NOH", stressed: false },
      { id: "to", text: "to", cue: "toh", stressed: false },
      { id: "saur", text: "saur", cue: "SORE", stressed: true },
      { id: "us", text: "us", cue: "us", stressed: false },
    ],
    pronunciation: "GIG · uh · NOH · toh · SORE · us",
    ipa: "/ˌɡɪɡəˌnoʊtoʊˈsɔrəs/",
    fact: "It had long, blade-like, serrated teeth suited to slicing meat.",
    factZh: "它有细长、像刀片一样带锯齿的牙齿，适合切割肉。",
    description: [
      "Giganotosaurus had a large head and long, blade-like teeth for slicing meat.",
      "It ate other animals and walked on two legs.",
      "It lived in Argentina during the Late Cretaceous Period.",
    ],
    descriptionZh: [
      "南方巨兽龙有大脑袋和细长、像刀片一样的牙齿，可以切割肉。",
      "它捕食其他动物，用两条腿行走。",
      "它生活在晚白垩世时期的阿根廷。",
    ],
    descriptionKeywords: [
      { word: "teeth", zh: "牙齿" },
      { word: "animals", zh: "动物" },
      { word: "Argentina", zh: "阿根廷" },
    ],
    soundTip:
      "Both g sounds are hard, as in gig, in this lesson; a soft first g is also used. Stress SORE.",
    soundTipZh:
      "本站两个 g 都发硬音，像 gig；第一个 g 发软音的读法也有人使用。SORE 要读得最重。",
    ...audioSources("giganotosaurus"),
    coachScript:
      "Listen, then say each part: GIG. uh. NOH. toh. SORE. us. Now blend it: GIG-uh-NOH-toh-SORE-us. Giganotosaurus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.giganotosaurus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/giganotosaurus.html`,
  },
  {
    id: "compsognathus",
    name: "Compsognathus",
    nameZh: "美颌龙",
    imageSrc: `${IMAGE_ROOT}/compsognathus.jpg`,
    difficulty: 3,
    chunks: [
      { id: "comp", text: "Comp", cue: "kahmp", stressed: false },
      { id: "sog", text: "sog", cue: "SOG", stressed: true },
      { id: "na", text: "na", cue: "nuh", stressed: false },
      { id: "thus", text: "thus", cue: "thuss", stressed: false },
    ],
    pronunciation: "kahmp · SOG · nuh · thuss",
    ipa: "/kɑmpˈsɑɡnəθəs/",
    fact: "It was a small meat-eater about 0.7 metres long.",
    factZh: "它是一种小型食肉恐龙，身长大约0.7米。",
    description: [
      "Compsognathus was a small dinosaur with sharp teeth and two long legs.",
      "It ate small animals and walked on two legs.",
      "It lived in France and Germany near the end of the Jurassic Period.",
    ],
    descriptionZh: [
      "美颌龙是一种小型恐龙，有锋利的牙齿和两条长腿。",
      "它捕食小动物，用两条腿行走。",
      "它生活在侏罗纪末期，也就是今天的法国和德国一带。",
    ],
    descriptionKeywords: [
      { word: "teeth", zh: "牙齿" },
      { word: "animals", zh: "动物" },
      { word: "Jurassic", zh: "侏罗纪" },
    ],
    soundTip:
      "Keep the g in SOG, then use th as in thin. Some museums instead stress NATH.",
    soundTipZh:
      "SOG 里的 g 要发出来，th 像 thin 的开头；有些博物馆会改为重读 NATH。",
    ...audioSources("compsognathus"),
    coachScript:
      "Listen, then say each part: kahmp. SOG. nuh. thuss. Now blend it: kahmp-SOG-nuh-thuss. Compsognathus.",
    imageSourceUrl: DINOSAUR_PRONUNCIATION_IMAGE_CREDITS.compsognathus.sourceUrl,
    factSourceUrl: `${NHM_DINOSAUR_ROOT}/compsognathus.html`,
  },
];

// `LESSONS` is the reader-facing name used by the interactive page. Keep the
// canonical `ITEMS` export for scripts and data validation.
export const DINOSAUR_PRONUNCIATION_LESSONS =
  DINOSAUR_PRONUNCIATION_ITEMS;

export function isDinosaurPronunciationId(
  value: string,
): value is DinosaurPronunciationId {
  return DINOSAUR_PRONUNCIATION_IDS.includes(
    value as DinosaurPronunciationId,
  );
}

export function dinosaurPronunciationById(
  id: DinosaurPronunciationId,
): DinosaurPronunciationItem {
  return DINOSAUR_PRONUNCIATION_ITEMS.find((item) => item.id === id)
    ?? DINOSAUR_PRONUNCIATION_ITEMS[0];
}
