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
  pageIndex: 5;
  printedPages: "6–7";
  blocks: readonly DinosaurCloseReadingBlock[];
};

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

export const DINOSAUR_CLOSE_READING_PAGE: DinosaurCloseReadingPage = {
  bookSlug: "dinosaur-david-lambert",
  pageIndex: 5,
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

export function dinosaurCloseReadingPageFor(
  bookSlug: string,
  pageIndex: number,
): DinosaurCloseReadingPage | null {
  return bookSlug === DINOSAUR_CLOSE_READING_PAGE.bookSlug
    && pageIndex === DINOSAUR_CLOSE_READING_PAGE.pageIndex
    ? DINOSAUR_CLOSE_READING_PAGE
    : null;
}
