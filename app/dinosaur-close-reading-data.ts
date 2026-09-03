export type DinosaurCloseReadingRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DinosaurCloseReadingBlock = {
  id: string;
  title: string;
  text: string;
  speechText?: string;
  rect: DinosaurCloseReadingRect;
  audioSrc: string;
};

export type DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert";
  pageIndex: number;
  printedPages: string;
  blocks: readonly DinosaurCloseReadingBlock[];
};

import { DINOSAUR_CLOSE_READING_REMAINING_PAGES } from "./dinosaur-close-reading-remaining-data.ts";

const AUDIO_ROOT = "/audio/dinosaur-close-reading/page-06";

function block(
  id: string,
  title: string,
  text: string,
  rect: DinosaurCloseReadingRect,
  speechText?: string,
): DinosaurCloseReadingBlock {
  return {
    id,
    title,
    text,
    speechText,
    rect,
    audioSrc: `${AUDIO_ROOT}/${id}.mp3`,
  };
}

function makePageBlock(readerPage: number) {
  const audioRoot = `/audio/dinosaur-close-reading/page-${String(readerPage).padStart(2, "0")}`;
  return (
    id: string,
    title: string,
    text: string,
    rect: DinosaurCloseReadingRect,
    speechText?: string,
  ): DinosaurCloseReadingBlock => ({
    id,
    title,
    text,
    speechText,
    rect,
    audioSrc: `${audioRoot}/${id}.mp3`,
  });
}

export const DINOSAUR_CLOSE_READING_PAGE: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 3,
  printedPages: "6–7",
  blocks: [
    block(
      "what-were-dinosaurs",
      "What were the dinosaurs?",
      "What were the dinosaurs? Long ago, strange beasts roamed the world. Some grew as big as a barn, others were smaller than a hen. Some walked on four legs, others on two. Some were fierce hunters, others were peaceful plant-eaters. These backboned land animals are called dinosaurs. Dinosaur means “terrible lizard,” and like lizards, dinosaurs were reptiles. But instead of sprawling, they walked upright, and some dinosaurs had feathers rather than scaly skin. In chilly air, instead of dozing like a lizard, some dinosaurs could stay active by generating their own body heat. The dinosaurs ruled Earth for 160 million years—flourishing on land more successfully than any other group of backboned animals. Then 65 million years ago, they mysteriously died out, except for one group—the dinosaurs that we call birds.",
      { left: 2.7, top: 4.8, width: 27.4, height: 34.0 },
    ),
    block(
      "skull-opening",
      "Opening in the skull",
      "Opening in skull in front of eye reduced the weight of the skull.",
      { left: 38.1, top: 7.8, width: 8.7, height: 4.2 },
    ),
    block(
      "s-shaped-neck",
      "S-shaped neck",
      "Neck with S-shaped curve.",
      { left: 44.8, top: 15.1, width: 4.2, height: 5.6 },
    ),
    block(
      "light-lower-jaw",
      "A lighter lower jaw",
      "Hole between bones of lower jaw helped to lighten the skull.",
      { left: 31.1, top: 38.0, width: 9.0, height: 4.3 },
    ),
    block(
      "lung",
      "Lung",
      "Lung.",
      { left: 10.7, top: 39.8, width: 3.0, height: 3.0 },
    ),
    block(
      "cervical-air-sac",
      "Cervical air sac",
      "Cervical air sac received used air from the lungs, ready to be exhaled.",
      { left: 17.2, top: 45.7, width: 6.1, height: 6.2 },
    ),
    block(
      "abdominal-air-sac",
      "Abdominal air sac",
      "Abdominal air sac received air inhaled through the nose and throat and supplied it to the lungs.",
      { left: 12.0, top: 51.7, width: 8.0, height: 6.5 },
    ),
    block(
      "breath-of-fresh-air",
      "A Breath of Fresh Air",
      "A Breath of Fresh Air. Unlike modern reptiles, some dinosaurs, including Majungatholus, had air sacs connected to their lungs, just as birds do. As in birds, the sacs acted like bellows, pushing a continuous flow of fresh air one way through the lungs. This breathing method is much more efficient than that of mammals. In mammals, some stale air gets mixed with fresh air in every breath.",
      { left: 2.8, top: 59.7, width: 18.7, height: 10.0 },
    ),
    block(
      "fossil-feathers",
      "Fossil Feathers",
      "Fossil Feathers. The fuzzy brown fringes around the skeleton of this fossil Microraptor are traces of feathers. Feathered dinosaurs had big advantages over those with scaly skin. Microraptor’s feathers helped to keep this small predatory dinosaur warm in cold weather. Long showy feathers probably helped the males to attract mates. And when Microraptor jumped off a tree with its feathered arms outstretched, its leap became a long glide.",
      { left: 23.6, top: 64.0, width: 20.3, height: 9.5 },
    ),
    block(
      "femur-socket",
      "Femur and hip socket",
      "Head of femur, or thigh bone, points inward to fit into socket between the hip bones, helping to keep the limb erect.",
      { left: 9.6, top: 69.8, width: 11.4, height: 5.2 },
    ),
    block(
      "walking-tall",
      "Walking Tall",
      "Walking Tall. The limb bones of dinosaurs show that they walked as mammals do, with legs erect underneath the body, not stuck out sideways as in lizards. The sprawling limbs of a lizard limit the expansion of the lungs when running, so the lizard must make breathing stops. The upright dinosaur did not have to stop to breathe when on the move. Also, the limbs of many dinosaurs could support bodies as heavy as a truck. Like those of most dinosaurs, the hind limbs of Tyrannosaurus had high ankles and narrow feet. Tyrannosaurus walked on its toes, which helped it to move quickly.",
      { left: 9.8, top: 76.8, width: 12.3, height: 18.0 },
    ),
    block(
      "age-of-dinosaurs",
      "The Age of Dinosaurs",
      "The Age of Dinosaurs. 250 mya. 200 mya. 145 mya. 65 mya. Today. Triassic. Jurassic. Cretaceous. Mesozoic Era. Cenozoic Era.",
      { left: 22.6, top: 76.8, width: 24.0, height: 11.1 },
      "The Age of Dinosaurs. Two hundred fifty million years ago. Two hundred million years ago. One hundred forty-five million years ago. Sixty-five million years ago. Today. Triassic. Jurassic. Cretaceous. Mesozoic Era. Cenozoic Era.",
    ),
    block(
      "homo-sapiens",
      "Homo sapiens",
      "Homo sapiens, or fully modern humans, appeared only around 200,000 years ago.",
      { left: 40.2, top: 73.8, width: 7.2, height: 6.8 },
    ),
    block(
      "time-before-humans",
      "A Time Before Humans",
      "A Time Before Humans. The Age of Dinosaurs lasted from about 230 million to 65 million years ago. It spans most of the geological era known as the Mesozoic, which is divided into the Triassic, Jurassic, and Cretaceous periods. Other than birds, all dinosaurs died out long before the first humans appeared on Earth.",
      { left: 23.6, top: 87.7, width: 20.4, height: 7.4 },
    ),
    block(
      "reptile-relations",
      "Reptile Relations",
      "Reptile Relations. Elasmosaurus was the longest-known plesiosaur, one of a group of marine reptiles from the Mesozoic Era. It grew to as long as 46 feet, or 14 metres. Other groups of large marine reptiles from this time include mosasaurs and ichthyosaurs. None of these was a dinosaur. They were from a different part of the reptile family tree.",
      { left: 51.9, top: 5.4, width: 15.0, height: 10.8 },
    ),
    block(
      "long-neck",
      "Extremely long neck",
      "Extremely long neck supported by 72 cervical vertebrae, or neck bones.",
      { left: 67.1, top: 28.1, width: 8.7, height: 5.4 },
    ),
    block(
      "flipper-limb",
      "Flipper-shaped limb",
      "Flipper-shaped limb.",
      { left: 83.2, top: 31.4, width: 6.5, height: 3.4 },
    ),
    block(
      "upright-hind-limb",
      "Upright hind limb",
      "Upright hind limb.",
      { left: 83.4, top: 60.2, width: 6.5, height: 3.5 },
    ),
    block(
      "thumblike-digit",
      "Thumblike digit",
      "Thumblike digit allowed the hand to grasp.",
      { left: 57.2, top: 66.4, width: 5.9, height: 6.6 },
    ),
    block(
      "three-digits",
      "Three main digits",
      "Hand with three main digits.",
      { left: 63.6, top: 74.0, width: 5.5, height: 4.5 },
    ),
    block(
      "weight-bearing-toe",
      "Weight-bearing toe",
      "Weight-bearing toe.",
      { left: 63.0, top: 79.2, width: 6.4, height: 3.4 },
    ),
    block(
      "hingelike-ankle",
      "Hingelike ankle",
      "Hingelike ankle braced hind limb.",
      { left: 73.6, top: 83.9, width: 4.0, height: 7.0 },
    ),
    block(
      "green-scaly-skin",
      "Green, scaly skin",
      "Green, scaly skin.",
      { left: 88.1, top: 68.3, width: 5.8, height: 3.6 },
    ),
    block(
      "sprawling-leg",
      "Sprawling leg",
      "Sprawling leg.",
      { left: 93.8, top: 70.4, width: 4.2, height: 5.2 },
    ),
    block(
      "dinosaur-features",
      "Dinosaur Features",
      "Dinosaur Features. Paleontologists—scientists who study fossils—helped to create this restoration of the meat-eating dinosaur Monolophosaurus. Like all dinosaurs, this fearsome predator stood upright thanks to the construction of its hip joints. It was bipedal, walking only on its hind limbs, its heavy tail balancing its upper body. Like many bipedal dinosaurs, Monolophosaurus’s third digits, or fingers, could twist a little to face the other two digits, forming grasping hands.",
      { left: 51.8, top: 81.2, width: 16.7, height: 12.3 },
    ),
    block(
      "terrible-lizards",
      "Terrible Lizards?",
      "Terrible Lizards? Dinosaurs were very unlike typical modern reptiles, such as this basilisk lizard. A basilisk is cold-blooded, meaning it relies on heat from the Sun for body warmth. But evidence of some dinosaurs’ birdlike lungs and feathers suggests they were warm-blooded, maintaining constant body temperatures with internal body heat. Unlike modern reptiles, they probably had a high-energy lifestyle like birds and mammals.",
      { left: 82.0, top: 84.8, width: 15.7, height: 11.0 },
    ),
  ],
};

const page7Block = makePageBlock(7);

const DINOSAUR_CLOSE_READING_PAGE_7: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 4,
  printedPages: "8–9",
  blocks: [
    page7Block(
      "different-designs",
      "Different designs",
      "Different designs. Paleontologists divide dinosaurs into two groups, according to how their hip bones are arranged. Most saurischians had hip bones like a lizard’s and were two-legged, meat-eating theropods, or four-legged, plant-eating sauropods. The ornithischians had hip bones like a bird’s and were plant-eaters. They included two-legged ornithopods, as well as plated, armored, and horned dinosaurs, which were all four-legged. Bony plates or spikes ran along the backs of stegosaurs, or plated dinosaurs, and bony body armor protected the ankylosaurs, or armored dinosaurs. Ceratopsians, or horned dinosaurs, bore horns on their heads and bony frills over their necks. The family tree on pages 64–65 shows how all these dinosaurs were related.",
      { left: 2.8, top: 4.2, width: 27.0, height: 31.0 },
    ),
    page7Block("hip-bones-face-apart", "Hip bones face apart", "Hip bones face in different directions.", { left: 2.8, top: 36.4, width: 7.2, height: 4.7 }),
    page7Block("gallimimus", "Gallimimus", "Gallimimus, a saurischian.", { left: 11.7, top: 41.3, width: 7.2, height: 4.3 }),
    page7Block("hip-bones-together", "Hip bones lie together", "Hip bones lie next to each other.", { left: 16.4, top: 36.5, width: 7.2, height: 4.7 }),
    page7Block("heterodontosaurus", "Heterodontosaurus", "Heterodontosaurus, an ornithischian.", { left: 24.2, top: 45.0, width: 8.0, height: 4.3 }),
    page7Block("immense-neck-frill", "Immense neck frill", "Immense bony neck frill.", { left: 29.5, top: 38.6, width: 6.2, height: 5.0 }),
    page7Block(
      "a-hip-issue",
      "A Hip Issue",
      "A Hip Issue. In most saurischian dinosaurs, the lower hip bones called the pubis, colored blue, and ischium, colored red, pointed in different directions. In all the ornithischian dinosaurs, both types of bone sloped down and back, lying parallel to each other. Some other later saurischians developed a hip bone arrangement similar to the ornithischians; these dinosaurs were the forerunners of birds.",
      { left: 2.8, top: 52.5, width: 21.0, height: 11.2 },
    ),
    page7Block("long-sharp-horn", "Long, sharp horn", "Long, sharp horn on the snout.", { left: 24.5, top: 59.5, width: 7.5, height: 4.2 }),
    page7Block("bony-plate", "Bony plate", "Bony plate.", { left: 19.8, top: 70.3, width: 6.0, height: 3.2 }),
    page7Block("styracosaurus", "Styracosaurus", "Styracosaurus.", { left: 25.7, top: 74.0, width: 6.0, height: 3.0 }),
    page7Block("stegosaurus", "Stegosaurus", "Stegosaurus.", { left: 15.7, top: 84.0, width: 6.5, height: 3.0 }),
    page7Block(
      "stegosaurs",
      "Stegosaurs",
      "Stegosaurs, or roof lizards, got their name from the double row of bony plates or spikes that jutted from their backs. Like the armored ankylosaurs, these so-called plated dinosaurs belonged to a group of ornithischians called thyreophorans, or shield bearers, which had body parts providing protection.",
      { left: 2.8, top: 88.0, width: 20.0, height: 8.0 },
    ),
    page7Block(
      "ceratopsians",
      "Ceratopsians",
      "Ceratopsians, or horned faces, were ornithischian plant-eaters. Many ceratopsians had long horns and a heavy neck shield. Smaller ridges rimmed the skulls of their two-legged relatives, pachycephalosaurs and psittacosaurs. All three formed the marginocephalians, or margin-headed dinosaurs. Most kinds of marginocephalians lived in the regions known today as North America and Asia.",
      { left: 22.7, top: 80.2, width: 13.8, height: 15.6 },
    ),
    page7Block("cutting-beak", "Cutting beak", "Cutting beak.", { left: 36.7, top: 89.0, width: 5.3, height: 4.0 }),
    page7Block("neck-frill-spike", "Neck-frill spike", "Bony spike jutting from neck frill.", { left: 56.3, top: 5.6, width: 8.0, height: 4.2 }),
    page7Block(
      "sauropods",
      "Sauropods",
      "Sauropods were gigantic saurischians with long necks and tails. The largest were the most massive animals of any kind that ever walked on Earth. Along with their early and mostly smaller relatives, prosauropods, the sauropods formed a group of long-necked plant-eaters called sauropodomorphs. These spread to all parts of the world and lived as far south as present-day Antarctica.",
      { left: 73.5, top: 5.0, width: 17.2, height: 12.0 },
    ),
    page7Block("immensely-long-neck", "Immensely long neck", "Immensely long neck.", { left: 91.5, top: 4.8, width: 6.5, height: 3.5 }),
    page7Block("whiplike-tail", "Whiplike tail", "Whiplike tail.", { left: 81.8, top: 18.6, width: 7.0, height: 3.2 }),
    page7Block(
      "ornithopods",
      "Ornithopods",
      "Ornithopods were plant-eaters that first appeared in the Jurassic Period. Early kinds were small and fast enough to outrun big meat-eaters. Later ones included bulky Muttaburrasaurus, Iguanodon, and the hadrosaurs, or duck-billed dinosaurs. These animals hurried on their hind limbs, but often ambled on all fours. The largest lived in the northern continents.",
      { left: 63.2, top: 21.5, width: 19.5, height: 12.2 },
    ),
    page7Block("bony-head-bump", "Bony bump on head", "Bony bump on head.", { left: 83.2, top: 22.5, width: 6.5, height: 4.0 }),
    page7Block("barosaurus", "Barosaurus", "Barosaurus.", { left: 93.5, top: 24.2, width: 5.0, height: 3.0 }),
    page7Block("heavy-tail", "Heavy tail", "Heavy tail.", { left: 61.5, top: 41.2, width: 5.5, height: 3.0 }),
    page7Block("muttaburrasaurus", "Muttaburrasaurus", "Muttaburrasaurus.", { left: 61.3, top: 45.4, width: 8.5, height: 3.0 }),
    page7Block("sharp-horny-beak", "Sharp and horny beak", "Sharp and horny beak.", { left: 83.0, top: 32.8, width: 6.8, height: 4.0 }),
    page7Block("forelimb-as-foot", "Forelimb used as a foot", "Forelimb used as a foot.", { left: 77.0, top: 42.4, width: 7.0, height: 4.3 }),
    page7Block("pillarlike-leg", "Pillarlike leg", "Pillarlike leg.", { left: 85.0, top: 39.8, width: 6.2, height: 4.0 }),
    page7Block("bony-tail-club", "Bony tail club", "Bony tail club.", { left: 64.4, top: 55.0, width: 5.5, height: 4.0 }),
    page7Block("armored-bands", "Armored bands", "Armored bands.", { left: 69.5, top: 53.2, width: 7.3, height: 3.3 }),
    page7Block("euoplocephalus", "Euoplocephalus", "Euoplocephalus.", { left: 70.3, top: 61.7, width: 7.0, height: 3.0 }),
    page7Block(
      "ankylosaurs",
      "Ankylosaurs",
      "Ankylosaurs were a group of armored ornithischians. Their four sturdy legs supported a barrel-shaped body. Some kinds, including Euoplocephalus, had a tail that ended in a bony club. Sharp shoulder spikes protected others.",
      { left: 85.8, top: 52.0, width: 12.5, height: 12.5 },
    ),
    page7Block("nose-horn", "Nose horn", "Nose horn.", { left: 68.8, top: 69.2, width: 7.0, height: 3.2 }),
    page7Block("bladelike-teeth", "Bladelike teeth", "Bladelike teeth.", { left: 68.3, top: 76.0, width: 7.3, height: 3.2 }),
    page7Block(
      "theropods",
      "Theropods",
      "Theropods, or beast feet, were carnivorous, or meat-eating, saurischians. Most had sharp teeth, and clawed toes on strong, birdlike feet. The theropods ranged from huge Tyrannosaurus to feathered animals no larger than a pigeon, some of which were ancestors of modern birds.",
      { left: 65.5, top: 81.0, width: 13.3, height: 14.5 },
    ),
    page7Block("ceratosaurus", "Ceratosaurus", "Ceratosaurus.", { left: 69.2, top: 93.0, width: 8.2, height: 3.0 }),
  ],
};

const page8Block = makePageBlock(8);

const DINOSAUR_CLOSE_READING_PAGE_8: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 5,
  printedPages: "10–11",
  blocks: [
    page8Block(
      "triassic-times",
      "Triassic times",
      "Triassic times. The Triassic Period lasted from around 250 to 200 million years ago. It was the first part of the Mesozoic Era—often called the Age of Dinosaurs. At this time, a mighty ocean surrounded a single massive continent. Some parts of the land were hot, and others were warm. Deserts covered inland regions cut off from moist winds that blew in from the ocean. Flowering plants had yet to appear. Reptilelike ancestors of mammals and many kinds of prehistoric reptile thrived in these conditions. Among the reptiles were lizards, plant-eating rhynchosaurs, and the ancestors of crocodiles. The first dinosaurs appeared in the latter half of the Triassic—some fed on plants, while others ate reptiles and the mammals’ ancestors. Above them flew the skin-winged pterosaurs, and other reptiles swam in shallow offshore seas.",
      { left: 14.2, top: 4.2, width: 34.0, height: 31.0 },
    ),
    page8Block(
      "triassic-world",
      "The Triassic World",
      "The Triassic World. In this period, all landmasses formed one supercontinent that spanned the globe, from pole to pole. Scientists call this Pangaea, meaning all Earth. Surrounding Pangaea was a single ocean, with a great inlet called the Tethys Sea. One landmass allowed the spread of dinosaurs across the globe.",
      { left: 2.8, top: 22.6, width: 10.8, height: 12.6 },
    ),
    page8Block("grasslike-leaves", "Grasslike leaves", "Tuft of grasslike leaves on a single, unbranched trunk.", { left: 2.6, top: 33.8, width: 6.5, height: 6.5 }),
    page8Block("pleuromeia", "Pleuromeia plants", "Pleuromeia plants.", { left: 14.0, top: 56.0, width: 6.0, height: 3.5 }),
    page8Block(
      "ancient-plants",
      "Ancient Plants",
      "Ancient Plants. Where the ground was moist enough for vegetation, strange plants thrived alongside some that are familiar to us today. Bushy-topped Pleuromeia was an unbranched treelike plant no taller than a man. Early in the Triassic Period, it lined many coasts and riversides. Damp places were also home to ferns and horsetails. Drier regions suited other kinds of plants, such as ginkgoes, seed ferns, cycads, palmlike plants called cycadeoids, and tall conifers related to the monkey puzzle tree.",
      { left: 25.3, top: 38.4, width: 17.7, height: 18.5 },
    ),
    page8Block("fern-frond", "Fern frond", "Fern frond.", { left: 42.3, top: 44.0, width: 6.0, height: 3.0 }),
    page8Block("desertlike-region", "Desertlike region", "Desertlike region.", { left: 31.7, top: 62.2, width: 7.8, height: 4.0 }),
    page8Block("ginkgo-leaves", "Ginkgo leaves", "Leaves of a ginkgo tree.", { left: 38.0, top: 62.0, width: 8.5, height: 4.0 }),
    page8Block(
      "dawn-of-dinosaurs",
      "Dawn of the Dinosaurs",
      "Dawn of the Dinosaurs. The first dinosaurs were probably small meat-eaters that were bipedal, walking on two legs. Plant-eaters, both bipedal and quadrupedal, walking on all fours, appeared at the end of the Triassic. By then, there were already theropods, prosauropods, and sauropods—the main groups of saurischian dinosaurs. The only known ornithischian dinosaurs were small bipeds not belonging to any of the later groups.",
      { left: 33.8, top: 68.0, width: 15.2, height: 16.0 },
    ),
    page8Block(
      "herrerasaurus",
      "Herrerasaurus",
      "Herrerasaurus, 228 million years ago. This bipedal hunter from Triassic Argentina is one of the earliest-known dinosaurs, perhaps predating the first theropods. It had a long tail that it used for balance while running.",
      { left: 34.0, top: 89.0, width: 15.0, height: 7.5 },
    ),
    page8Block("flexible-neck", "Flexible neck", "Flexible neck.", { left: 52.2, top: 5.2, width: 6.2, height: 3.5 }),
    page8Block(
      "reptiles-take-flight",
      "Reptiles Take Flight",
      "Reptiles Take Flight. A flying reptile about 28 inches, or 70 centimetres, long, Eudimorphodon was one of the earliest-known pterosaurs, which were relatives of dinosaurs. It had skin wings, toothy jaws, and a long, bony tail. Eudimorphodon flew over what is now north Italy about 210 million years ago, perhaps seizing small fish with its sharp teeth.",
      { left: 67.2, top: 5.0, width: 22.0, height: 10.3 },
    ),
    page8Block("clawed-finger", "Clawed finger", "Clawed finger.", { left: 69.2, top: 14.2, width: 7.0, height: 3.0 }),
    page8Block("elongated-fourth-finger", "Elongated fourth finger", "Elongated fourth finger supports the wing.", { left: 87.0, top: 4.3, width: 10.0, height: 4.2 }),
    page8Block("bony-tail", "Bony tail", "Bony tail.", { left: 64.3, top: 31.0, width: 6.5, height: 3.0 }),
    page8Block("skin-wing", "Skin wing", "Wing made of skin.", { left: 70.8, top: 27.2, width: 8.0, height: 3.0 }),
    page8Block("armored-back", "Armored back", "Armored back.", { left: 90.5, top: 18.8, width: 7.5, height: 3.2 }),
    page8Block("projecting-front-teeth", "Projecting front teeth", "Front teeth project forward.", { left: 80.8, top: 26.8, width: 7.0, height: 4.0 }),
    page8Block("cropping-beak", "Cropping beak", "Beak for cropping plants.", { left: 52.0, top: 33.0, width: 7.5, height: 4.0 }),
    page8Block(
      "armored-sea-reptiles",
      "Armored Sea Reptiles",
      "Armored Sea Reptiles. Placodus, or flat tooth, belonged to a group of reptiles called placodonts, one of several kinds of large reptiles living in Triassic seas. It was as long as a man. About 200 million years ago, this sprawling, short-necked creature plucked shellfish from rocks with its jutting front teeth, then crushed them using flat teeth in the roof of its mouth.",
      { left: 73.0, top: 32.0, width: 16.5, height: 15.0 },
    ),
    page8Block("fossil-skull", "Fossil skull", "Fossil skull.", { left: 68.2, top: 46.0, width: 7.0, height: 3.0 }),
    page8Block("sprawling-limb", "Sprawling limb", "Sprawling limb.", { left: 87.8, top: 44.0, width: 7.0, height: 3.0 }),
    page8Block(
      "plant-eating-reptiles",
      "Plant-eating Reptiles",
      "Plant-eating Reptiles. Several groups of giant reptile dominated Triassic wildlife before dinosaurs gradually replaced them. This beaked skull comes from Hyperodapedon, a piglike reptile with a big head and a squat, barrel-shaped body. It was one of the rhynchosaurs, a group of plant-eating reptiles that chopped up seed ferns with their teeth. Hyperodapedon was widespread 220 million years ago.",
      { left: 51.8, top: 52.0, width: 20.3, height: 10.7 },
    ),
    page8Block("furry-body", "Furry body", "Fur probably covered the body.", { left: 77.5, top: 50.0, width: 8.0, height: 3.5 }),
    page8Block(
      "emergence-of-mammals",
      "The Emergence of Mammals",
      "The Emergence of Mammals. Mammals emerged in the Triassic Period, evolving from reptilelike ancestors. Small, shrewlike Megazostrodon lived in southern Africa as the Triassic Period was ending. This furry creature had almost all the features of a mammal. It would have snapped up insects and baby lizards but kept well clear of hungry dinosaurs. Megazostrodon probably spent the daytime hiding in a hole and only ventured out to hunt at night.",
      { left: 85.5, top: 51.0, width: 12.5, height: 16.8 },
    ),
    page8Block("mammal-like-teeth", "Mammal-like teeth", "Mammal-like teeth of different shapes and sizes.", { left: 77.0, top: 68.3, width: 9.5, height: 4.0 }),
    page8Block(
      "plateosaurus",
      "Plateosaurus",
      "Plateosaurus, 215 million years ago. This prosauropod grew up to 26 feet, or 8 metres, long, but the bulky plant-eater supported itself on its hind limbs only. Plateosaurus might have roamed in herds and was widespread in Late Triassic Europe.",
      { left: 51.5, top: 89.5, width: 16.5, height: 7.5 },
    ),
    page8Block(
      "eocursor",
      "Eocursor",
      "Eocursor, 210 million years ago. A plant-eater slightly larger than a fox, Eocursor is the only Triassic ornithischian dinosaur for which fairly complete fossils have been found. Eocursor ran very fast and lived in Triassic South Africa.",
      { left: 68.0, top: 89.5, width: 16.0, height: 7.5 },
    ),
    page8Block(
      "coelophysis",
      "Coelophysis",
      "Coelophysis, 208 million years ago. This theropod was longer than a man, but lighter. It had slim, pointed jaws and small, sharp teeth, and swallowed smaller creatures whole. Paleontologists found many of its skeletons in New Mexico.",
      { left: 84.0, top: 89.5, width: 14.5, height: 7.5 },
    ),
  ],
};

const page9Block = makePageBlock(9);

const DINOSAUR_CLOSE_READING_PAGE_9: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 6,
  printedPages: "12–13",
  blocks: [
    page9Block(
      "jurassic-times",
      "Jurassic times",
      "Jurassic times. The Jurassic Period lasted from around 200 to 145 million years ago. It formed the middle part of the Mesozoic Era and is sometimes called the Age of Giants because huge sauropod dinosaurs flourished at this time. By now the supercontinent Pangaea had begun to crack. Where a great rift split apart Earth’s continental crust, the Atlantic Ocean formed and then widened, separating lands on either side. Moist winds from the seas could reach many inland regions, bringing rain to places that had once been deserts. It was warm everywhere. Plants began to grow in barren lands, providing food for new kinds of large and small plant-eating dinosaurs. Above these, pterosaurs shared the air with the first birds, descendants of small predatory dinosaurs. Early salamanders swam in lakes and streams, and Jurassic seas swarmed with big swimming reptiles. Many of these hunted fish that resembled some of those alive today.",
      { left: 14.2, top: 4.1, width: 34.0, height: 32.0 },
    ),
    page9Block(
      "jurassic-world",
      "The Jurassic World",
      "The Jurassic World. Pangaea broke up into a northern landmass called Laurasia and a southern landmass called Gondwana. But these smaller supercontinents soon started breaking up as well. Laurasia started to split into the northern continents of North America, Europe, and Asia. Gondwana began splitting into South America, Africa, India, Australia, and Antarctica.",
      { left: 2.7, top: 22.5, width: 11.0, height: 16.5 },
    ),
    page9Block("sprawling-limb", "Sprawling limb", "Sprawling limb.", { left: 7.0, top: 40.0, width: 5.5, height: 4.0 }),
    page9Block(
      "first-amphibians",
      "First Amphibians",
      "First Amphibians. Frogs and salamanders as we know them today first appeared in the Jurassic Period. Karaurus is one of the earliest-known salamanders. Paleontologists discovered its remains in Late Jurassic rocks in Kazakhstan. Despite its age, Karaurus’s fossil skeleton resembles those of salamanders that are alive today. About 8 inches, or 20 centimetres, long, this small amphibian was a good swimmer. It probably lived in streams or pools, snapping up creatures such as snails and insects.",
      { left: 18.6, top: 43.3, width: 14.5, height: 18.5 },
    ),
    page9Block("backbone", "Backbone", "Backbone.", { left: 6.5, top: 61.0, width: 6.0, height: 3.0 }),
    page9Block("broad-skull", "Broad skull", "Broad skull.", { left: 22.2, top: 63.2, width: 6.5, height: 3.0 }),
    page9Block(
      "jurassic-sea-reptiles",
      "Jurassic Sea Reptiles",
      "Jurassic Sea Reptiles. Aside from its long, narrow jaws and vertical tail, Ichthyosaurus, or fish lizard, was shaped like a dolphin. It grew 6 and a half feet, or 2 metres, long and swam fast, using its large eyes to spot the fish it hunted for food. Ichthyosaurs were one of several groups of large Jurassic reptile superbly adapted for life in the sea. They were not related to dinosaurs.",
      { left: 31.7, top: 54.0, width: 15.0, height: 10.6 },
    ),
    page9Block(
      "giants-and-birds",
      "Giants and Birds",
      "Giants and Birds. During the Jurassic Period, the prosauropods died out, but sauropods and theropods flourished. Among them were the largest plant-eating and meat-eating land animals of the time, although some theropods from this period were feathered creatures no bigger than crows. The ornithopods, stegosaurs, and ankylosaurs all appeared in the Jurassic Period.",
      { left: 2.7, top: 67.5, width: 17.2, height: 11.0 },
    ),
    page9Block(
      "scelidosaurus",
      "Scelidosaurus",
      "Scelidosaurus, 190 million years ago. The ankylosaur Scelidosaurus was one of the earliest and most primitive armored dinosaur. As long as a mid-sized car, it lived in the northern landmass Laurasia.",
      { left: 2.4, top: 89.5, width: 15.2, height: 7.2 },
    ),
    page9Block(
      "barapasaurus",
      "Barapasaurus",
      "Barapasaurus, 190 million years ago. Barapasaurus, or big-legged lizard, gets its name from a thigh bone 5 and a half feet, or 1.7 metres, long. This sauropod had slim limbs and unusual hollows in its vertebrae, or back bones. It grew 60 feet, or 18 metres, long and lived in Jurassic India.",
      { left: 17.6, top: 89.5, width: 15.3, height: 7.2 },
    ),
    page9Block(
      "guanlong",
      "Guanlong",
      "Guanlong, 160 million years ago. Guanlong was one of the earliest members of the tyrannosauroid group of theropods. This crested dinosaur from China grew only 10 feet, or 3 metres, long, but shared key features with Tyrannosaurus.",
      { left: 33.0, top: 89.5, width: 15.2, height: 7.2 },
    ),
    page9Block("long-neck", "Long neck", "Long neck.", { left: 59.2, top: 7.4, width: 7.0, height: 3.0 }),
    page9Block("long-skull", "Long skull", "Long skull.", { left: 68.0, top: 5.0, width: 6.0, height: 3.0 }),
    page9Block("skin-wing", "Skin wing", "Wing made of skin.", { left: 64.0, top: 17.5, width: 7.2, height: 3.0 }),
    page9Block(
      "agile-fliers",
      "Agile Fliers",
      "Agile Fliers. Jurassic pterosaurs such as Pterodactylus, or wing finger, had longer necks and skulls than their Triassic ancestors. Their short tails made them agile in the air. Many species of Pterodactylus lived in Africa and Europe, the largest with a wingspan of 8 feet, or 2.4 metres. It is likely that these pterosaurs flew low over water, their sharp teeth seizing unsuspecting fish.",
      { left: 52.7, top: 30.5, width: 16.0, height: 12.0 },
    ),
    page9Block(
      "jurassic-vegetation",
      "Jurassic Vegetation",
      "Jurassic Vegetation. The major types of plant at this time were those that had flourished in the Triassic Period. Gymnosperms included ginkgoes, monkey puzzle trees, and cycadeoids such as Williamsonia—a small, stumpy tree with palmlike fronds that sprouted from the top. Meadows of ferns, horsetails, and mosses carpeted damp soil. In drier areas, strips of forest lined the riverbanks. Flowering plants had not yet appeared.",
      { left: 74.5, top: 4.5, width: 17.5, height: 14.0 },
    ),
    page9Block("cycadlike-leaves", "Cycadlike leaves", "Cycadlike leaves.", { left: 71.8, top: 21.0, width: 7.0, height: 3.5 }),
    page9Block("monkey-puzzle-leaves", "Monkey puzzle leaves", "Leaves of a monkey puzzle tree.", { left: 92.0, top: 8.3, width: 6.0, height: 4.2 }),
    page9Block("williamsonia", "Williamsonia plants", "Williamsonia plants.", { left: 89.5, top: 30.0, width: 8.0, height: 3.2 }),
    page9Block("powerful-jaws", "Powerful jaws", "Powerful jaws.", { left: 59.7, top: 44.0, width: 7.5, height: 3.0 }),
    page9Block(
      "crocodile-ancestor",
      "Crocodile Ancestor",
      "Crocodile Ancestor. Protosuchus, or first crocodile, belonged to the same group of reptile as modern crocodiles and alligators—only remotely related to dinosaurs. But this animal had relatively longer and more agile legs and ran around on land. Protosuchus was a hunter the size of a large dog, armed with powerful jaws. It lived early in the Jurassic Period in present-day Arizona.",
      { left: 52.0, top: 55.0, width: 16.5, height: 12.3 },
    ),
    page9Block("short-stocky-trunk", "Short, stocky trunk", "Short, stocky trunk.", { left: 64.2, top: 70.0, width: 7.5, height: 3.0 }),
    page9Block(
      "kentrosaurus",
      "Kentrosaurus",
      "Kentrosaurus, 156 million years ago. Related to the more famous Stegosaurus, Kentrosaurus, or spiked lizard, bristled with paired narrow plates or spikes jutting from its neck, back, and tail. This plated dinosaur lived in East Africa.",
      { left: 51.7, top: 89.5, width: 16.0, height: 7.2 },
    ),
    page9Block(
      "sinraptor",
      "Sinraptor",
      "Sinraptor, 155 million years ago. Sinraptor lived in what is now a desert in northwest China. This big meat-eater, about 25 feet, or 7.6 metres, long, was related to the better-known North American theropod Allosaurus.",
      { left: 67.8, top: 89.5, width: 16.0, height: 7.2 },
    ),
    page9Block(
      "archaeopteryx",
      "Archaeopteryx",
      "Archaeopteryx, 150 million years ago. The crow-sized bird Archaeopteryx had feathered wings and body but also had a theropod’s teeth, claws, tail, and scaly legs. Fine-grained limestone rocks of southwest Germany preserve its fossil skeletons.",
      { left: 83.8, top: 89.5, width: 14.6, height: 7.2 },
    ),
  ],
};

const page10Block = makePageBlock(10);

const DINOSAUR_CLOSE_READING_PAGE_10: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 7,
  printedPages: "14–15",
  blocks: [
    page10Block(
      "cretaceous-times",
      "Cretaceous times",
      "Cretaceous times. The Cretaceous Period lasted from 145 to 65 million years ago and closed the Mesozoic Era, marking the climax of the Age of Dinosaurs. Climates remained warm or mild, but great changes happened to our planet. Flowering plants began to replace older kinds, seas flooded low-lying lands, and continents split up and moved apart. As the landmasses separated, the dinosaurs that became cut off from one another adapted to different environments. In the late Cretaceous Period, there were probably more kinds of dinosaur than ever before.",
      { left: 14.2, top: 4.2, width: 24.8, height: 34.0 },
    ),
    page10Block(
      "cretaceous-world",
      "The Cretaceous World",
      "The Cretaceous World. In the Cretaceous Period, the supercontinents Laurasia and Gondwana broke up completely. Their fragments gradually took on the shapes of the continents we know today. By the end of this period, most had drifted close to their present positions, but India had not yet docked with Asia. For a while, shallow seas overflowed stretches of low-lying land.",
      { left: 2.8, top: 22.5, width: 11.0, height: 16.0 },
    ),
    page10Block("leafy-trunk", "Leafy trunk", "Upper part of trunk covered with leaves.", { left: 22.8, top: 40.0, width: 9.0, height: 4.0 }),
    page10Block(
      "foliage-to-flowers",
      "From Foliage to Flowers",
      "From Foliage to Flowers. Early in the Cretaceous Period, plants such as conifers, cycads, and ferns still covered the land. A strange tree-fern called Tempskya was widespread in the northern continents. It had a false trunk made of stems surrounded by roots, with leaves that grew outward. Angiosperms, or flowering plants, appeared for the first time. They began to grow on open ground and spread out from the tropics, changing landscapes forever. Most early kinds of angiosperm were probably small and weedy, but some gave rise to shrubs and small trees. By the end of the Cretaceous Period, magnolias and other flowering trees had formed extensive forests.",
      { left: 14.5, top: 45.0, width: 17.5, height: 19.0 },
    ),
    page10Block("magnolia-flower", "Magnolia flower", "Magnolia flower.", { left: 8.5, top: 60.0, width: 6.5, height: 4.0 }),
    page10Block("tempskya-forest", "Tempskya forest", "Tempskya tree-fern forest.", { left: 23.3, top: 64.0, width: 9.5, height: 3.2 }),
    page10Block(
      "age-of-diversity",
      "An Age of Diversity",
      "An Age of Diversity. Cretaceous dinosaurs included some of the most massive sauropods and theropods of all time. Theropods now also included an amazing variety of feathered birds and birdlike dinosaurs—some smaller than a sparrow, and others as large as an elephant. Stegosaurs had vanished, but the horned dinosaurs appeared, as did the largest ankylosaurs and ornithopods.",
      { left: 2.8, top: 66.0, width: 17.0, height: 11.5 },
    ),
    page10Block(
      "sauropelta",
      "Sauropelta",
      "Sauropelta, 115 million years ago. Twice the length of a large rhinoceros, Sauropelta was an ankylosaur that roamed the Early Cretaceous woodlands in western North America. Bony cones and studs guarded its back and tail against attack.",
      { left: 2.3, top: 89.5, width: 15.5, height: 7.2 },
    ),
    page10Block(
      "alxasaurus",
      "Alxasaurus",
      "Alxasaurus, 110 million years ago. Alxasaurus, or Alxa lizard, from China’s Alxa Desert was an early therizinosauroid—one of a group of pot-bellied, plant-eating theropods probably covered in feathery down.",
      { left: 17.8, top: 89.5, width: 15.3, height: 7.2 },
    ),
    page10Block(
      "styracosaurus",
      "Styracosaurus",
      "Styracosaurus, 76.5 million years ago. A large horned dinosaur from North America, Styracosaurus measured 18 feet, or 5.5 metres, in length and got its name from the long spikes on its neck frill. Its sharp beak could slice through tough vegetation.",
      { left: 33.1, top: 89.5, width: 15.2, height: 7.2 },
    ),
    page10Block("long-wing", "Immensely long wing", "Immensely long wing.", { left: 61.0, top: 6.0, width: 8.0, height: 3.5 }),
    page10Block("lower-jaw-bulb", "Bulbous lower jaw", "Bulbous structure on lower jaw.", { left: 77.5, top: 5.5, width: 8.5, height: 3.5 }),
    page10Block(
      "airborne-giant",
      "Airborne Giant",
      "Airborne Giant. Cretaceous pterosaurs included the largest of all flying reptiles. Ornithocheirus had a long snout, but its most remarkable feature was its great size. This might have been one of the largest pterosaurs ever—as heavy as a man and with the wingspan of a small plane. Ornithocheirus flew above Europe and South America about 125 million years ago.",
      { left: 87.2, top: 5.0, width: 11.2, height: 14.0 },
    ),
    page10Block("trailing-foot", "Trailing foot", "Trailing foot.", { left: 70.0, top: 14.5, width: 7.0, height: 3.0 }),
    page10Block("wing-downstroke", "Wing making downstroke", "Wing making downstroke.", { left: 62.5, top: 19.0, width: 8.0, height: 3.2 }),
    page10Block("small-toothed-beak", "Small-toothed beak", "Beak with small teeth.", { left: 76.8, top: 23.3, width: 7.5, height: 3.2 }),
    page10Block(
      "here-come-the-birds",
      "Here Come the Birds",
      "Here Come the Birds. The first truly modern birds began to appear in the Cretaceous Period. Hummingbird-sized Liaoxiornis was one of the smallest birds from the Mesozoic Era. It lived in eastern Asia early in the Cretaceous Period. Liaoxiornis looked like modern birds, but probably belonged to a group of primitive birds called enantiornithes, or opposite birds. In these birds, a knob on the coracoid bone near the shoulder fit into a basin in the shoulder blade. In birds today, the arrangement is the other way around.",
      { left: 60.0, top: 31.0, width: 17.0, height: 15.5 },
    ),
    page10Block("pointed-nose", "Sensitive nose", "Sensitive, pointed nose.", { left: 77.3, top: 28.0, width: 7.5, height: 4.0 }),
    page10Block("furry-body", "Furry body", "Lightweight, furry body.", { left: 84.8, top: 27.0, width: 7.5, height: 3.5 }),
    page10Block("long-tail", "Long tail", "Long tail.", { left: 93.7, top: 31.0, width: 5.0, height: 3.0 }),
    page10Block(
      "modern-mammals",
      "Modern Mammals",
      "Modern Mammals. New kinds of mammal were emerging in the Cretaceous Period, including Zalambdalestes, an early placental mammal, with unborn young nourished by a placenta in the mother’s womb. Zalambdalestes lived in Late Cretaceous Mongolia and had a long nose like that of an elephant shrew. It hunted in the undergrowth, crushing insects between molar teeth.",
      { left: 78.5, top: 41.0, width: 19.2, height: 10.0 },
    ),
    page10Block(
      "sea-monster",
      "Sea Monster",
      "Sea Monster. At a length of about 40 feet, or 12.5 metres, Mosasaurus was one of the largest of the Late Cretaceous marine mosasaur reptiles. The mosasaurs were more closely related to lizards than to dinosaurs. Mosasaurus swam with paddle-shaped limbs and a long, flattened tail, seizing fish and ammonites in its huge, sharp-toothed jaws. Its fossils were discovered in 1764 near Maastricht, the Netherlands, and Mosasaurus was named after the nearby Meuse River, called Mosa in Latin.",
      { left: 77.0, top: 55.0, width: 20.0, height: 12.5 },
    ),
    page10Block(
      "saltasaurus",
      "Saltasaurus",
      "Saltasaurus, 75 million years ago. This sauropod was named after the Argentinian province of Salta where its fossils were first found. Saltasaurus was 39 feet, or 12 metres, long, with an unusual hide protected by thousands of small, bony lumps.",
      { left: 51.6, top: 89.5, width: 16.2, height: 7.2 },
    ),
    page10Block(
      "edmontosaurus",
      "Edmontosaurus",
      "Edmontosaurus, 70 million years ago. Edmontosaurus was one of the last and largest of the hadrosaurs, or duck-billed dinosaurs. Up to 43 feet, or 13 metres, long and perhaps as heavy as an elephant, this plant-eater roamed western Canada.",
      { left: 67.8, top: 89.5, width: 16.2, height: 7.2 },
    ),
    page10Block(
      "albertosaurus",
      "Albertosaurus",
      "Albertosaurus, 72 million years ago. A predator with a massive head and tiny, two-fingered hands, Albertosaurus was somewhat smaller than its close relative Tyrannosaurus. Both lived in western North America.",
      { left: 84.0, top: 89.5, width: 14.5, height: 7.2 },
    ),
  ],
};

const page11Block = makePageBlock(11);

const DINOSAUR_CLOSE_READING_PAGE_11: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 8,
  printedPages: "16–17",
  blocks: [
    page11Block(
      "end-of-an-era",
      "The end of an era",
      "The end of an era. Dinosaurs flourished for more than 160 million years. Then, about 65 million years ago, all disappeared except for the small theropods that we know as birds. Most other sizeable creatures vanished, too, such as the gigantic swimming reptiles and the skin-winged flying reptiles called pterosaurs. Great changes must have happened to the world to drive so many kinds of animal into extinction. At least two great disasters struck. First came a series of massive volcanic eruptions. Then an asteroid, a large lump of rock from space, as big as a city hit Earth with the force of a colossal nuclear explosion.",
      { left: 14.2, top: 4.2, width: 25.0, height: 29.0 },
    ),
    page11Block(
      "volcanic-eruptions",
      "Volcanic Eruptions",
      "Volcanic Eruptions. Volcanic eruptions in central India at the end of the Cretaceous Period released vast lava flows and huge quantities of dust and toxic gases into the atmosphere. Blown around the world by winds, they could have altered climates in ways that killed many plants and animals.",
      { left: 2.8, top: 22.5, width: 11.2, height: 12.5 },
    ),
    page11Block(
      "asteroid-impact",
      "Asteroid Impact",
      "Asteroid Impact. About 65 million years ago, a molten asteroid 6 miles, or 10 kilometres, across crashed into Earth at several thousand miles an hour. The fireball struck with the force of more than two million hydrogen bombs, sending enormous shockwaves rippling around the world. Immense clouds of dust hid the Sun for months. The whole planet cooled, which had devastating effects on the world’s climate, helping to kill seven out of every ten species of creature that lived on land or at sea.",
      { left: 2.8, top: 36.0, width: 23.5, height: 10.5 },
    ),
    page11Block("fireball", "Fireball striking Earth", "Fireball striking Earth.", { left: 26.0, top: 40.0, width: 7.0, height: 4.2 }),
    page11Block("shockwave", "Shockwave", "Shockwave.", { left: 12.8, top: 47.0, width: 6.5, height: 3.2 }),
    page11Block("impact-crater-location", "Impact crater", "Impact crater in Mexico’s Yucatán peninsula.", { left: 67.0, top: 5.0, width: 9.5, height: 4.0 }),
    page11Block("iridium-layer", "Iridium layer", "Iridium layer.", { left: 77.8, top: 4.0, width: 8.0, height: 3.2 }),
    page11Block(
      "chicxulub-crater",
      "Chicxulub Crater",
      "Chicxulub Crater. A crater 110 miles, or 180 kilometres, across marks where the asteroid hit Earth. Few surface traces remain. Engineers discovered the crater when scouting sites for oil drilling near Puerto Chicxulub village, Mexico. Scientists measured the magnetic field strength across the region and found a concentration of magnetic rocks at the crater’s center, shown in red below. This suggests that the impact uplifted strongly magnetic rocks from deep beneath Earth’s surface. A ring of negative readings, in blue, shows where molten surface rock, liquefied by the heat of the impact, pooled, became magnetized, and froze.",
      { left: 68.0, top: 8.0, width: 16.0, height: 20.5 },
    ),
    page11Block("satellite-image", "Satellite image", "Satellite image of Central America.", { left: 56.5, top: 17.0, width: 7.0, height: 4.5 }),
    page11Block("magnetic-center", "Magnetic center", "Strongly magnetic rocks at center.", { left: 78.8, top: 30.0, width: 9.0, height: 4.0 }),
    page11Block("magnetic-field-map", "Magnetic field map", "Map of the magnetic field in the crater region.", { left: 53.8, top: 39.5, width: 8.0, height: 5.0 }),
    page11Block("magnetism-ring", "Ring of magnetism", "Ring of magnetism reveals the crater’s shape.", { left: 58.8, top: 44.0, width: 9.0, height: 4.5 }),
    page11Block(
      "iridium-deposits",
      "Iridium Deposits",
      "Iridium Deposits. The element iridium is scarce on Earth but plentiful in asteroids. Around the world, scientists have found a layer of iridium above the last rock layer with fossil dinosaurs and below the first rock layer without dinosaur fossils. It is believed that this iridium came from the asteroid that punched out the Chicxulub crater. The presence of scraps of glassy rock that shot up after the impact and then rained down around the crater is further evidence of the asteroid impact.",
      { left: 84.0, top: 17.0, width: 14.0, height: 15.5 },
    ),
    page11Block(
      "tiny-victims",
      "Tiny Victims",
      "Tiny Victims. Soft, white chalk is a pure variety of limestone formed from the shells of trillions of tiny organisms called coccolithophores. Late in the Cretaceous Period, their remains formed thick chalk layers beneath the sea. Such layers now form England’s chalk sea cliffs. Almost all coccolithophores mysteriously disappeared around the same time as the dinosaurs.",
      { left: 77.5, top: 34.0, width: 14.5, height: 13.0 },
    ),
    page11Block("chalk-fragment", "Fragment of chalk", "Fragment of chalk.", { left: 88.0, top: 46.0, width: 8.0, height: 3.0 }),
    page11Block("massive-beak", "Massive beak", "Massive beak.", { left: 70.3, top: 46.0, width: 6.5, height: 4.0 }),
    page11Block(
      "death-in-ocean",
      "Death in the Ocean",
      "Death in the Ocean. Other organisms, such as ammonites, also became extinct around the same time as the dinosaurs. Ammonites were sea creatures related to squid, and their numbers had already begun to decline late in the Cretaceous Period due to a loss of habitat. Undersea volcanic activity in the mid-Cretaceous caused changes in the seafloor. The sea level rose and the ocean spilled over low-lying lands, creating shallow seas that were ideal habitat for ammonites and a range of reptiles and other organisms. When the seas retreated later in the Cretaceous, the ammonites and other wildlife lost their homes.",
      { left: 63.0, top: 49.0, width: 13.8, height: 19.0 },
    ),
    page11Block(
      "outlasting-catastrophe",
      "Outlasting the Catastrophe",
      "Outlasting the Catastrophe. This flightless bird belonged to one of the groups of animal that survived the mass extinction, which brought the Cretaceous Period to an end. Gastornis, or Gaston’s bird, had a powerful kick, a massive beak, and stood taller than a man. For a time, it seemed that such birds might fill the gap left by the predatory dinosaurs, but birds like this eventually died out as well.",
      { left: 82.3, top: 53.0, width: 16.0, height: 13.5 },
    ),
    page11Block("stumpy-wings", "Stumpy wings", "Stumpy wings.", { left: 72.8, top: 70.0, width: 7.0, height: 3.2 }),
    page11Block("tidal-waves", "Tidal waves", "Tidal waves rippling over the ocean.", { left: 52.0, top: 76.0, width: 8.5, height: 4.0 }),
    page11Block("hooflike-claws", "Hooflike claws", "Hooflike claws.", { left: 76.8, top: 83.0, width: 7.5, height: 3.2 }),
    page11Block(
      "mammal-survivors",
      "Mammal Survivors",
      "Mammal Survivors. Ten million years after most dinosaurs died out, Phenacodus, a furry plant-eater with hooflike claws and grinding cheek teeth, roamed the woodlands of North America and Europe. Mammals far larger than this sheep-sized animal also began to appear by this time, and they survived because there were no large theropods to prey on them.",
      { left: 62.0, top: 86.0, width: 21.0, height: 10.5 },
    ),
  ],
};

const page12Block = makePageBlock(12);

const DINOSAUR_CLOSE_READING_PAGE_12: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 9,
  printedPages: "18–19",
  blocks: [
    page12Block(
      "how-do-we-know",
      "How do we know?",
      "How do we know? We know what long-dead dinosaurs were like because paleontologists have dug up their remains. Most belonged to corpses buried under mud, sand, or volcanic ash that slowly hardened into rock. Minerals filled pores in the bones and hardened them, or replaced them altogether, turning bone to stone in a process called permineralization. Usually only fossilized bones remain, but sometimes the shapes of skin, tendons, and muscles survive too.",
      { left: 8.0, top: 5.0, width: 29.2, height: 28.0 },
    ),
    page12Block(
      "digging-up-the-past",
      "Digging Up the Past",
      "Digging Up the Past. Paleontologist Luis Chiappe excavates a Protoceratops skull at Ukhaa Tolgod in Mongolia's Gobi Desert. Determined dinosaur hunters sometimes travel halfway around the world to reach the best bone beds. There they may camp and work in harsh conditions, putting up with scorching heat or bitter cold.",
      { left: 38.0, top: 20.0, width: 9.6, height: 13.5 },
    ),
    page12Block("dinosaur-at-riverbank", "Dinosaur at a riverbank", "A dinosaur at a riverbank.", { left: 24.4, top: 34.7, width: 8.2, height: 5.0 }),
    page12Block("recently-dead-dinosaurs", "Recently dead dinosaurs", "Bones of recently deceased dinosaurs.", { left: 35.8, top: 35.8, width: 7.3, height: 6.0 }),
    page12Block("layers-building", "Layers building up", "Layers of sediment building up on top.", { left: 44.2, top: 42.8, width: 4.3, height: 6.5 }),
    page12Block("layered-rocks", "Layered rocks", "A stack of layered rocks.", { left: 9.6, top: 67.0, width: 6.1, height: 5.0 }),
    page12Block("dry-riverbed", "Dry riverbed", "A dry riverbed.", { left: 17.1, top: 72.0, width: 6.2, height: 4.0 }),
    page12Block(
      "rock-layers",
      "Rock Layers",
      "Rock Layers. Fossils occur in sedimentary rocks, formed when sand, mud, and gravel build up in layers and are compressed over millions of years. In undisturbed layers, the oldest rocks lie at the bottom and the youngest at the top. Index fossils help scientists compare ages, while radioactive elements allow rocks to be dated accurately.",
      { left: 8.0, top: 76.5, width: 15.0, height: 18.3 },
    ),
    page12Block("dinosaur-fossil-in-rock", "Dinosaur fossil in rock", "A dinosaur fossil preserved in rock.", { left: 28.3, top: 77.0, width: 6.0, height: 4.8 }),
    page12Block(
      "story-of-a-fossil",
      "The Story of a Fossil",
      "The Story of a Fossil. Dinosaurs drowned in a river. Their flesh rotted away, leaving bones in wet mud. More sediment buried the bones and slowly turned into rock. Minerals changed the bones into fossils. Over millions of years, wind and rain wore away the rock until dinosaur hunters discovered the fossils at the surface.",
      { left: 24.8, top: 82.8, width: 15.8, height: 12.2 },
    ),
    page12Block(
      "prehistoric-treasure",
      "Prehistoric Treasure",
      "Prehistoric Treasure. Almost all the bones in this Dilophosaurus skeleton are intact and connected much as they were in life. Complete dinosaur skeletons are extremely rare because scavenging animals and weather usually break up and scatter the bones.",
      { left: 51.9, top: 21.1, width: 17.2, height: 12.0 },
    ),
    page12Block("fossilized-skin", "Fossilized skin", "A fossilized skin impression covers the fossil bones.", { left: 89.0, top: 5.8, width: 8.0, height: 4.5 }),
    page12Block("twisted-body", "A twisted body", "The body is twisted because tendons shrank in dry heat.", { left: 70.7, top: 23.0, width: 8.0, height: 5.0 }),
    page12Block(
      "dinosaur-mummy",
      "Dinosaur Mummy",
      "Dinosaur Mummy. This Edmontosaurus fossil has traces of pebbly skin. River mud covered the dinosaur before its body decayed. The mud filled a mold of the skin and later turned to rock, preserving its shape. Such a find is called a mummy and teaches us about dinosaur soft tissues.",
      { left: 86.3, top: 20.0, width: 11.5, height: 14.2 },
    ),
    page12Block(
      "molds-and-casts",
      "Molds and Casts",
      "Molds and Casts. Sometimes a dead organism rots away completely and leaves an impression called a mold. Minerals may fill the impression with a stony lump in the shape of the organism. This new fossil is called a cast.",
      { left: 52.9, top: 35.5, width: 14.2, height: 12.5 },
    ),
    page12Block("ammonite-mold", "Ammonite mold", "An ammonite mold: the impression left by the organism.", { left: 72.7, top: 35.2, width: 6.6, height: 9.0 }),
    page12Block("ammonite-cast", "Ammonite cast", "An ammonite cast: a stony copy in the organism's shape.", { left: 63.0, top: 50.5, width: 7.3, height: 11.0 }),
    page12Block(
      "trace-fossils",
      "Trace Fossils",
      "Trace Fossils. A footprint shows where a dinosaur once walked through mud. Fossil eggs, nests, and dung also reveal how dinosaurs behaved. These traces help us learn how dinosaurs moved, bred, and ate—facts that bones alone cannot easily show.",
      { left: 78.2, top: 63.0, width: 19.2, height: 10.7 },
    ),
    page12Block("fossil-excavation", "Excavating a fossil", "A paleontologist excavating a dinosaur fossil in an eroded desert landscape.", { left: 68.8, top: 62.8, width: 8.2, height: 9.0 }),
    page12Block(
      "carbonized-plant-tissue",
      "Carbonized Plant Tissue",
      "Carbonized Plant Tissue. A shiny black and brown film made of carbon is all that remains of this fern frond. Plant fossils help scientists picture the vegetation in a particular place and time.",
      { left: 77.2, top: 85.3, width: 14.3, height: 10.5 },
    ),
  ],
};

const page13Block = makePageBlock(13);

const DINOSAUR_CLOSE_READING_PAGE_13: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 10,
  printedPages: "20–21",
  blocks: [
    page13Block(
      "first-fossil-finds",
      "The First Fossil Finds",
      "The First Fossil Finds. People had unearthed giant fossil bones long before they knew about dinosaurs. Scientific discovery began in England in the early 1820s. Gideon Mantell collected bones and teeth from a Sussex quarry and named a giant prehistoric reptile Iguanodon. Richard Owen later grouped it with two other creatures and invented the name Dinosauria, meaning terrible lizards, in 1842.",
      { left: 14.2, top: 4.8, width: 33.5, height: 24.0 },
    ),
    page13Block("megalosaurus-thigh", "Megalosaurus thigh bone", "A fossilized Megalosaurus thigh bone.", { left: 3.2, top: 3.8, width: 9.0, height: 15.6 }),
    page13Block(
      "an-early-find",
      "An Early Find",
      "An Early Find. In 1677, English museum curator Robert Plot published the first picture of a dinosaur fossil. He mistakenly described this Megalosaurus fossil as the thigh bone of a giant man.",
      { left: 2.8, top: 20.0, width: 10.5, height: 9.2 },
    ),
    page13Block(
      "guess-again",
      "Guess Again!",
      "Guess Again! Gideon Mantell drew this sketch to show what he believed Iguanodon looked like. With only a few broken bones, he imagined an outsized iguana perched on a branch. He mistook the thumb spike for a nose horn and drew the tail thin and whiplike instead of heavy and stiff.",
      { left: 19.8, top: 40.0, width: 11.8, height: 18.0 },
    ),
    page13Block(
      "a-toothy-clue",
      "A Toothy Clue",
      "A Toothy Clue. Gideon Mantell noticed that large fossil teeth resembled the teeth of an iguana, so he chose the name Iguanodon, meaning iguana toothed. A famous story credits his wife Mary with finding the first tooth, but local quarrymen probably found it.",
      { left: 2.8, top: 51.5, width: 15.8, height: 11.0 },
    ),
    page13Block("serrated-tooth", "Sharp, serrated tooth", "A sharp, serrated Iguanodon tooth.", { left: 24.4, top: 62.5, width: 6.0, height: 6.0 }),
    page13Block("dentary", "Dentary", "The dentary is a bone in the lower jaw.", { left: 10.0, top: 65.8, width: 7.0, height: 5.0 }),
    page13Block(
      "first-of-many",
      "The First of Many",
      "The First of Many. In 1824, British geologist William Buckland published his description of a Megalosaurus fossil jaw. It became the first dinosaur to receive a scientific name. Although Mantell named Iguanodon by 1822, its name was not printed until 1825, making it second on the growing list.",
      { left: 2.8, top: 70.7, width: 10.5, height: 20.8 },
    ),
    page13Block("megalosaurus-jaw", "Megalosaurus jaw", "A fossilized Megalosaurus jaw.", { left: 3.0, top: 91.4, width: 10.5, height: 4.0 }),
    page13Block(
      "whats-in-a-name",
      "What's in a Name?",
      "What's in a Name? Anatomist Richard Owen suggested the word dinosaur when only three kinds were known. He saw that they formed a special group: unlike ordinary reptiles, they stood on erect limbs and had fused backbones above the hips. Owen also founded London's Natural History Museum.",
      { left: 65.1, top: 5.0, width: 11.8, height: 18.0 },
    ),
    page13Block(
      "lifesize-sculptures",
      "Lifesize Sculptures",
      "Lifesize Sculptures. The earliest life-size dinosaur models looked like scaly rhinoceroses. Benjamin Waterhouse Hawkins built concrete models of Iguanodon, Megalosaurus, and Hylaeosaurus for Sydenham Park in 1853. Richard Owen and other scientists even ate a banquet inside a hollow Iguanodon model.",
      { left: 80.2, top: 5.3, width: 17.4, height: 12.3 },
    ),
    page13Block("concrete-models", "Concrete Iguanodon models", "Concrete models of Iguanodon in Sydenham Park.", { left: 84.3, top: 18.8, width: 12.0, height: 5.0 }),
    page13Block("long-front-tooth", "Long front tooth", "A long front tooth from Tyrannosaurus.", { left: 60.5, top: 48.5, width: 5.2, height: 5.5 }),
    page13Block(
      "wild-wild-west",
      "Wild Wild West",
      "Wild Wild West. Anchisaurus bones were unearthed in Connecticut as early as 1818. In the 1870s, the spotlight shifted to the American West. Famous dinosaur hunter Barnum Brown found many fossils and discovered the first Tyrannosaurus skeleton in Montana in 1902.",
      { left: 68.1, top: 47.0, width: 13.0, height: 20.0 },
    ),
    page13Block(
      "fact-or-fiction",
      "Fact or Fiction?",
      "Fact or Fiction? Ancient stories about a hooked-beaked, talon-footed griffin may have been inspired by Protoceratops fossils found in central Asia. The story could have travelled through Persia to Greece and helped create the legend of the griffin.",
      { left: 70.8, top: 73.8, width: 13.5, height: 19.0 },
    ),
    page13Block("griffin-statue", "Persian griffin", "A Persian statue of a griffin.", { left: 83.8, top: 73.5, width: 14.0, height: 22.0 }),
  ],
};

const page14Block = makePageBlock(14);

const DINOSAUR_CLOSE_READING_PAGE_14: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 11,
  printedPages: "22–23",
  blocks: [
    page14Block(
      "little-and-large",
      "Little and Large",
      "Little and Large. Most dinosaurs were no bigger than an elephant, but some sauropods were the longest and heaviest land animals ever. Brachiosaurus stood as high as a four-story building. Diplodocus stretched as long as three buses. Argentinosaurus may have weighed as much as ten bull elephants. At the other extreme, Compsognathus was little bigger than a chicken, and Microraptor was smaller still.",
      { left: 15.0, top: 4.8, width: 33.0, height: 36.5 },
    ),
    page14Block(
      "the-high-life",
      "The High Life",
      "The High Life. A mounted Barosaurus skeleton in the American Museum of Natural History shows its awesome size. If sauropods reared up, this mother could have held her head fifty feet above the ground while protecting her young from an Allosaurus.",
      { left: 2.8, top: 30.0, width: 11.8, height: 14.0 },
    ),
    page14Block(
      "extreme-sizes",
      "Extreme Sizes",
      "Extreme Sizes. These dinosaurs are compared with a six-foot human. Mei long measured twenty-seven inches. Carcharodontosaurus reached forty-four feet. Argentinosaurus was one hundred to one hundred ten feet long. Iguanodon reached thirty-six feet, and Triceratops twenty-nine and a half feet.",
      { left: 2.8, top: 62.0, width: 11.0, height: 16.0 },
    ),
    page14Block("powerful-hind-limb", "Powerful hind limb", "A powerful hind limb.", { left: 15.8, top: 82.0, width: 8.5, height: 5.0 }),
    page14Block("massive-jaw", "Massive jaw", "Sharklike teeth in a massive jaw.", { left: 35.5, top: 81.0, width: 8.0, height: 6.0 }),
    page14Block("size-lineup", "Dinosaur size lineup", "Human. Mei long. Carcharodontosaurus. Argentinosaurus. Iguanodon. Triceratops.", { left: 2.8, top: 90.0, width: 94.0, height: 6.0 }),
    page14Block(
      "movie-monsters",
      "Movie Monsters",
      "Movie Monsters. The huge size of dinosaurs has inspired films in which gigantic creatures such as Godzilla rampage through cities. No real dinosaur ever grew as large as these movie monsters, but visual effects make them look convincing.",
      { left: 67.3, top: 5.2, width: 14.7, height: 11.2 },
    ),
    page14Block("small-head", "Small head", "A small head relative to body size.", { left: 90.7, top: 5.8, width: 7.0, height: 6.0 }),
    page14Block("long-neck", "Long neck", "A long neck.", { left: 63.5, top: 47.0, width: 7.0, height: 4.0 }),
    page14Block("clawed-finger", "Clawed finger", "A clawed finger.", { left: 84.6, top: 26.0, width: 8.0, height: 4.0 }),
    page14Block("feathered-legs", "Feathered legs", "Feathered legs served as extra wings.", { left: 75.0, top: 31.5, width: 8.3, height: 5.0 }),
    page14Block(
      "dinosaur-biplane",
      "Dinosaur Biplane",
      "Dinosaur Biplane. Microraptor gui was one of the smallest nonbird dinosaurs. It was bigger than a pigeon but weighed only two and a quarter pounds. This little theropod was about thirty inches long and could glide at least one hundred thirty feet from tree to tree.",
      { left: 88.2, top: 31.5, width: 9.7, height: 14.5 },
    ),
    page14Block("birdlike-foot", "Birdlike foot", "A birdlike foot.", { left: 75.0, top: 53.0, width: 5.5, height: 5.0 }),
    page14Block("compsognathus", "Compsognathus", "Compsognathus, meaning elegant jaw, was no bigger than a chicken.", { left: 80.2, top: 49.5, width: 9.0, height: 7.0 }),
    page14Block("chicken", "Chicken", "A chicken shown for size comparison.", { left: 89.5, top: 48.5, width: 7.0, height: 11.0 }),
    page14Block(
      "chicken-sized",
      "Chicken-sized",
      "Chicken-sized. Compsognathus lived on tropical islands that now form southern Germany and France. This agile hunter ate lizards. Scientists even found the remains of a long-tailed lizard called Bavarisaurus inside the rib cage of a fossil Compsognathus.",
      { left: 78.6, top: 60.0, width: 18.7, height: 9.0 },
    ),
  ],
};

const page15Block = makePageBlock(15);

const DINOSAUR_CLOSE_READING_PAGE_15: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 12,
  printedPages: "24–25",
  blocks: [
    page15Block(
      "dinosaur-evolution",
      "Dinosaur Evolution",
      "Dinosaur Evolution. Dinosaurs and humans have skeletons based on the same plan because both evolved from the same prehistoric backboned animal. Evolution is the process by which a species gradually changes. Helpful traits allow animals to adapt and survive. Over many generations, new species form. Fish with fins gave rise to four-legged animals, then separate groups became mammal ancestors and reptiles, and from sprawling reptiles came dinosaurs.",
      { left: 16.0, top: 4.8, width: 32.0, height: 30.5 },
    ),
    page15Block(
      "fishy-forerunner",
      "Fishy Forerunner",
      "Fishy Forerunner. Panderichthys was a fish that lived about 380 million years ago. An animal like this was an ancestor of all tetrapods. Its fleshy fins contained limb-like bones, and its skull, ribs, and tooth enamel were more like those of tetrapods than fish.",
      { left: 2.8, top: 19.8, width: 12.4, height: 15.0 },
    ),
    page15Block(
      "first-creatures-with-legs",
      "The First Creatures with Legs",
      "The First Creatures with Legs. Acanthostega lived in shallow water around 360 million years ago. It had gills and a tail fin like a fish, but also had hip bones, limb bones, toes, and fingers. Its spine was stiffened, and its head could move separately from its shoulders.",
      { left: 22.7, top: 36.5, width: 20.8, height: 10.8 },
    ),
    page15Block("paddlelike-tail", "Paddlelike tail fin", "A paddlelike tail fin.", { left: 3.2, top: 37.0, width: 7.0, height: 8.0 }),
    page15Block("eight-digits", "Eight digits", "Acanthostega had eight digits.", { left: 10.0, top: 45.0, width: 7.2, height: 5.0 }),
    page15Block(
      "ancestors-of-reptiles",
      "Ancestors of Reptiles",
      "Ancestors of Reptiles. Early tetrapods laid eggs in water. Later, some produced eggs protected by a membrane called an amnion. These amniotes became the ancestors of reptiles and mammals. Westlothiana lived 330 million years ago and may have been an early amniote.",
      { left: 10.0, top: 53.0, width: 16.5, height: 14.0 },
    ),
    page15Block("five-digits", "Five digits", "Westlothiana had five digits.", { left: 3.5, top: 57.0, width: 6.0, height: 6.0 }),
    page15Block("lizardlike-tail", "Lizardlike tail", "A long, lizardlike tail.", { left: 9.7, top: 67.0, width: 8.0, height: 5.0 }),
    page15Block(
      "sprawling-walker",
      "A Sprawling Walker",
      "A Sprawling Walker. Crocodile-like Chasmatosaurus belonged to the archosaurs, a group that also included crocodiles and dinosaurs. Its limbs stuck out sideways, so it walked in the sprawling way that lizards do. It lived about 250 million years ago.",
      { left: 2.8, top: 86.0, width: 16.0, height: 10.0 },
    ),
    page15Block(
      "rearing-to-run",
      "Rearing to Run",
      "Rearing to Run. Cat-sized Euparkeria lived about 245 million years ago. Its hind limbs were longer than its forelimbs and tucked beneath its body. It probably reared up to run on its hind limbs, balancing with its long tail.",
      { left: 26.2, top: 86.0, width: 16.8, height: 10.0 },
    ),
    page15Block(
      "skeletons-compared",
      "Skeletons Compared",
      "Skeletons Compared. A Tyrannosaurus and a human skeleton can be matched almost bone for bone because they inherited the same basic plan from a distant fishy ancestor. Tyrannosaurus has a longer skull and many vertebrae forming a tail. Humans have only one tail bone, the coccyx.",
      { left: 83.5, top: 5.0, width: 13.8, height: 17.5 },
    ),
    page15Block("tyrannosaurus-skeleton", "Tyrannosaurus skeleton", "Skull, backbone, pelvis, ribs, hands, shin bones, and toe bones in a Tyrannosaurus skeleton.", { left: 52.3, top: 4.5, width: 24.0, height: 24.0 }),
    page15Block("human-skeleton", "Human skeleton", "The same basic bones in a human skeleton.", { left: 75.0, top: 7.5, width: 8.0, height: 22.0 }),
    page15Block(
      "dinosaur-dawn",
      "Dinosaur Dawn",
      "Dinosaur Dawn. Eoraptor, meaning dawn thief, lived 228 million years ago. This small two-legged hunter had erect legs and grasping hands. But its neck and thumbs were shorter than those of later theropods and sauropodomorphs.",
      { left: 51.8, top: 31.2, width: 14.0, height: 12.5 },
    ),
  ],
};

const page16Block = makePageBlock(16);

const DINOSAUR_CLOSE_READING_PAGE_16: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 13,
  printedPages: "26–27",
  blocks: [
    page16Block(
      "heads-and-brains",
      "Heads and Brains",
      "Heads and Brains. A dinosaur's head was built around separate skull bones that supported the jaws and protected the brain. Openings served the eyes, ears, nostrils, and jaw muscles, while extra holes reduced weight. Dinosaur skulls ranged from light and slender to heavy and armored. Their brains were usually smaller and simpler than mammal brains, although some theropods had large, birdlike brains and keen senses.",
      { left: 2.8, top: 4.8, width: 33.5, height: 28.5 },
    ),
    page16Block("naris", "Naris", "The naris is the opening for the nostril.", { left: 19.8, top: 34.0, width: 9.7, height: 5.0 }),
    page16Block("orbit", "Orbit", "The orbit is the opening for the eye.", { left: 24.0, top: 43.0, width: 7.0, height: 5.0 }),
    page16Block(
      "armored-head",
      "Armored Head",
      "Armored Head. Ankylosaurus had a thick, heavy skull that protected its low, broad head from bites. Unlike many dinosaurs, it had no large windows in its skull—only four small openings for the eyes and nostrils. A relative even had bony eyelids that closed like shutters.",
      { left: 2.8, top: 51.0, width: 13.0, height: 15.0 },
    ),
    page16Block("ankylosaurus-skull", "Ankylosaurus skull", "A thick, solid Ankylosaurus skull.", { left: 17.0, top: 51.0, width: 14.8, height: 17.0 }),
    page16Block("second-naris", "Nostril opening", "Another view of the naris, the opening for the nostril.", { left: 8.0, top: 65.0, width: 10.0, height: 5.0 }),
    page16Block("slender-bone-rods", "Slender rods of bone", "Slender rods of bone and a large skull window reduced weight.", { left: 27.0, top: 73.0, width: 9.0, height: 8.0 }),
    page16Block(
      "skull-with-struts",
      "A Skull with Struts",
      "A Skull with Struts. Camarasaurus had a delicately built skull with slender bony rods, except around the working jaws. A light skull mattered more than protection because this sauropod could hold its head high to avoid predators and reach branches.",
      { left: 35.0, top: 77.0, width: 13.8, height: 17.5 },
    ),
    page16Block("antorbital-fenestra", "Antorbital fenestra", "The antorbital fenestra is a window in front of the eye opening.", { left: 51.5, top: 5.0, width: 8.2, height: 7.0 }),
    page16Block("tiny-cerebrum", "Tiny cerebrum", "Tyrannosaurus had a tiny cerebrum compared with a human.", { left: 56.8, top: 4.8, width: 8.0, height: 5.0 }),
    page16Block("brain-cast", "Brain cast", "A cast of the hollow space once occupied by the Tyrannosaurus brain.", { left: 76.5, top: 8.0, width: 7.0, height: 5.0 }),
    page16Block(
      "comparing-brains",
      "Comparing Brains",
      "Comparing Brains. Tyrannosaurus had an enormous skull, but much of it held toothy jaws. Its brain was relatively small. Scientists studied a cast of the brain cavity and saw a tiny cerebrum. A human's much larger cerebrum makes speech and complex thinking possible, while Tyrannosaurus managed well with a brain mainly supervising muscles and senses.",
      { left: 85.0, top: 5.0, width: 12.5, height: 22.0 },
    ),
    page16Block("human-brain", "Human brain", "The cerebrum forms about eighty-five percent of the human brain. The cerebellum controls movement and the senses.", { left: 84.5, top: 28.0, width: 13.0, height: 18.0 }),
    page16Block(
      "quick-witted",
      "Quick-witted?",
      "Quick-witted? Troodon had a heavier brain relative to its body than almost any other dinosaur. Its brain may have been as sophisticated as a modern cassowary's. This hunter could probably track and ambush prey well.",
      { left: 51.5, top: 80.5, width: 15.5, height: 14.5 },
    ),
    page16Block(
      "hunting-in-packs",
      "Hunting in Packs",
      "Hunting in Packs. Deinonychus and Tenontosaurus fossils have been found near each other. Some paleontologists think clever theropods hunted in packs like wolves. Others think the animals died separately and a river later deposited their bodies together.",
      { left: 76.0, top: 82.5, width: 21.8, height: 13.0 },
    ),
  ],
};

export const DINOSAUR_CLOSE_READING_PAGES: readonly DinosaurCloseReadingPage[] = [
  DINOSAUR_CLOSE_READING_PAGE,
  DINOSAUR_CLOSE_READING_PAGE_7,
  DINOSAUR_CLOSE_READING_PAGE_8,
  DINOSAUR_CLOSE_READING_PAGE_9,
  DINOSAUR_CLOSE_READING_PAGE_10,
  DINOSAUR_CLOSE_READING_PAGE_11,
  DINOSAUR_CLOSE_READING_PAGE_12,
  DINOSAUR_CLOSE_READING_PAGE_13,
  DINOSAUR_CLOSE_READING_PAGE_14,
  DINOSAUR_CLOSE_READING_PAGE_15,
  DINOSAUR_CLOSE_READING_PAGE_16,
  ...DINOSAUR_CLOSE_READING_REMAINING_PAGES,
];

export function dinosaurCloseReadingPageFor(
  bookSlug: string,
  pageIndex: number,
): DinosaurCloseReadingPage | null {
  return DINOSAUR_CLOSE_READING_PAGES.find(
    (candidate) => candidate.bookSlug === bookSlug && candidate.pageIndex === pageIndex,
  ) ?? null;
}
