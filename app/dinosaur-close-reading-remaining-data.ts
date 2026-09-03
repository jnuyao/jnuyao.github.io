import type {
  DinosaurCloseReadingBlock,
  DinosaurCloseReadingPage,
  DinosaurCloseReadingRect,
} from "./dinosaur-close-reading-data.ts";

type Side = "left" | "right";
type LocalRect = readonly [left: number, top: number, width: number, height: number];
type BlockDraft = readonly [
  side: Side,
  id: string,
  title: string,
  text: string,
  rect: LocalRect,
];

function spreadRect(side: Side, [left, top, width, height]: LocalRect): DinosaurCloseReadingRect {
  return {
    left: (side === "right" ? 50 : 0) + left / 2,
    top,
    width: width / 2,
    height,
  };
}

function closeReadingPage(
  readerPage: number,
  printedPages: string,
  drafts: readonly BlockDraft[],
): DinosaurCloseReadingPage {
  const audioPage = readerPage + 2;
  const audioRoot = `/audio/dinosaur-close-reading/page-${String(audioPage).padStart(2, "0")}`;
  const blocks: DinosaurCloseReadingBlock[] = drafts.map(([side, id, title, text, rect]) => ({
    id,
    title,
    text,
    rect: spreadRect(side, rect),
    audioSrc: `${audioRoot}/${id}.mp3`,
  }));
  return {
    bookSlug: "dinosaur-david-lambert",
    pageIndex: readerPage - 1,
    printedPages,
    blocks,
  };
}

const page15 = closeReadingPage(15, "28–29", [
  ["left", "horns-and-head-crests", "Horns and head crests", "Many dinosaurs had bumps, horns, or crests on their heads. They may have used them to scare rivals, impress mates, recognize their own species, or defend themselves.", [4, 5, 51, 35]],
  ["left", "three-horned-face", "Three-horned face", "Triceratops means three-horned face. Its two long brow horns, short nose horn, and broad bony shield could help in display, rivalry, and protection.", [55, 5, 39, 20]],
  ["left", "thick-nose", "A thick nose", "Pachyrhinosaurus had a thick, flattened bony boss instead of a long nose horn. Rival animals may have pushed against each other with these strong bosses.", [5, 41, 32, 24]],
  ["left", "thick-headed", "Thick-headed dinosaurs", "Pachycephalosaurs such as Stegoceras had very thick skull roofs. They may have displayed their domes or used them during contests with rivals.", [5, 78, 31, 17]],
  ["left", "ready-to-fight", "Ready to fight", "Male deer lock antlers and push during contests. This living example helps scientists imagine how some horned dinosaurs may have behaved.", [55, 79, 39, 17]],
  ["right", "bulls-horns", "Bull's horns", "Carnotaurus had two short horns above its eyes. They were probably too small for killing prey, but they may have been useful for display or contests between males.", [25, 30, 69, 20]],
  ["right", "crested-dinosaurs", "Crested dinosaurs", "Lambeosaurus and Corythosaurus had tall head crests. Different shapes may have helped members of the same species recognize one another.", [29, 79, 65, 17]],
]);

const page16 = closeReadingPage(16, "30–31", [
  ["left", "senses-and-communication", "Senses and communication", "Dinosaurs used sight, smell, taste, hearing, balance, and touch to find food and mates and to detect danger. Skull openings and braincases give scientists clues about these senses.", [28, 5, 46, 38]],
  ["left", "calling-out", "Calling out", "Parasaurolophus may have forced air through its hollow crest to make a low, trombone-like call. A herd could use calls to communicate over a distance.", [5, 6, 22, 27]],
  ["left", "side-vision", "Side vision", "Gallimimus had an eye on each side of its head. This monocular vision gave it a wide view and helped it notice danger from many directions.", [5, 55, 27, 16]],
  ["left", "eyes-forward", "Eyes forward", "Troodon had forward-facing eyes. Binocular vision let both eyes focus on the same object and helped this hunter judge distance.", [57, 55, 37, 18]],
  ["left", "seeing-things", "Seeing things", "The blue fields show what Gallimimus and Troodon could see. Gallimimus saw more around its body, while Troodon had a wider overlapping view in front.", [5, 76, 89, 19]],
  ["right", "in-the-dark", "In the dark", "Leaellynasaura had large eyes and large optic lobes. These features may have helped it see during the long winter darkness near the South Pole.", [48, 17, 43, 20]],
  ["right", "sniffing-it-out", "Sniffing it out", "Tyrannosaurus had large olfactory lobes for interpreting smells. It could probably detect food from far away and may have both hunted and scavenged.", [7, 40, 35, 20]],
  ["right", "bright-and-colorful", "Bright and colorful", "Cryolophosaurus may have had a brightly colored crest. Colorful skin, crests, or feathers could help dinosaurs attract mates or send visual signals.", [7, 61, 42, 17]],
  ["right", "hiding-in-plain-sight", "Hiding in plain sight", "Spots, stripes, and colors may have camouflaged dinosaurs. A greenish Iguanodon among tree ferns would have been hard for a predator to see.", [56, 78, 39, 17]],
]);

const page17 = closeReadingPage(17, "32–33", [
  ["left", "meat-eaters", "Meat-eaters", "Large meat-eating dinosaurs had powerful jaws and knife-like teeth for killing prey and tearing flesh. Smaller theropods often caught insects, lizards, and other small animals.", [4, 5, 53, 29]],
  ["left", "top-chopper", "Top chopper", "Allosaurus had strong jaw muscles and blade-like teeth. Its skull was built for quick chopping bites rather than the bone-crushing bite of Tyrannosaurus.", [5, 56, 31, 17]],
  ["left", "open-wide", "Open wide", "Movable joints let the jaws of Allosaurus gape and expand. This helped it swallow very large pieces of meat.", [5, 84, 31, 12]],
  ["left", "tyrannosaur-attack", "Tyrannosaur attack", "Tarbosaurus used deep jaws and strong teeth to seize large prey. A heavy tail balanced its head and body while it attacked.", [48, 77, 46, 18]],
  ["right", "gut-and-gizzard", "Gut and gizzard", "A theropod's digestive system probably worked much like a crocodile's. Some dinosaurs may have swallowed stones that helped a muscular gizzard break up food.", [4, 5, 39, 21]],
  ["right", "killing-teeth", "Killing teeth", "Megalosaurus had curved teeth with serrated edges like a steak knife. Worn or broken teeth were replaced by new ones.", [47, 6, 47, 21]],
  ["right", "dinosaur-droppings", "Dinosaur droppings", "Scientists study coprolites, or fossil droppings, to discover what dinosaurs ate. Tiny bone pieces inside can identify the prey of a meat-eater.", [42, 23, 52, 18]],
  ["right", "fish-eater", "Fish-eater", "Baryonyx had long jaws and slender teeth that could grip slippery fish. Fossil evidence shows that it ate fish and sometimes other dinosaurs.", [27, 54, 39, 18]],
  ["right", "toothless-hunter", "A toothless hunter", "Citipati had a toothless beak and sharp bony prongs inside its mouth. It may have eaten eggs, shellfish, leaves, fruit, and other foods.", [55, 80, 39, 16]],
]);

const page18 = closeReadingPage(18, "34–35", [
  ["left", "plant-eaters", "Plant-eaters", "Plant-eating dinosaurs had jaws, teeth, stomachs, and intestines suited to cropping and digesting vegetation. Different species selected and processed plants in different ways.", [18, 5, 62, 29]],
  ["left", "mowing-machine", "Mowing machine", "Nigersaurus had hundreds of replaceable teeth at the front of its wide mouth. It probably cropped low plants as it walked.", [5, 35, 26, 20]],
  ["left", "stones-in-the-gut", "Stones in the gut", "Smooth stones found with sauropod fossils were once thought to grind food in a gizzard. New research suggests many of those stones may have had another origin.", [5, 56, 29, 17]],
  ["left", "wear-and-tear", "Wear and tear", "Iguanodon teeth wore down as they sliced tough plants. New teeth grew to replace the old ones, keeping the chewing surface sharp.", [5, 78, 31, 17]],
  ["right", "treetop-browser", "Treetop browser", "Brachiosaurus used its long neck to reach high branches. Its strong teeth stripped leaves, and its long digestive system processed large amounts of food.", [7, 5, 39, 31]],
  ["right", "great-grinder", "Great grinder", "Hadrosaurs had batteries of closely packed teeth. As old teeth wore out, new ones moved into place, creating a powerful grinding surface.", [58, 36, 36, 20]],
  ["right", "parrot-beak", "Parrot beak", "Psittacosaurus means parrot lizard. Its sharp beak could snip leaves and crack hard plant parts.", [58, 58, 36, 15]],
  ["right", "mixed-diet", "A mixed diet", "Lesothosaurus had ridged cheek teeth for plants and sharper front teeth. It may have eaten plants as well as small animals.", [59, 78, 35, 17]],
]);

const page19 = closeReadingPage(19, "36–37", [
  ["left", "long-and-short-necks", "Long and short necks", "Sauropods had the longest necks of all dinosaurs and could reach leaves high above the ground. Armored and horned dinosaurs had shorter necks, while theropods often had muscular S-shaped necks.", [4, 5, 52, 28]],
  ["left", "high-reacher", "High reacher or hedged cutter?", "Diplodocus had light, hollow neck bones. Scientists debate whether it raised its head high or swept its long neck across low vegetation.", [54, 5, 40, 22]],
  ["left", "braced-for-heavy-heads", "Braced for heavy heads", "Strong muscles and ligaments supported the massive head of Brachiosaurus. Its heart had to pump blood a long way up its neck.", [27, 36, 35, 18]],
  ["left", "jurassic-giants", "Jurassic giants", "A herd of Brachiosaurus could browse high in the trees. Their long necks let them reach food unavailable to smaller plant-eaters.", [5, 70, 30, 25]],
  ["right", "short-and-strong", "Short and strong", "Protoceratops had a short, powerful neck. Fused neck vertebrae helped support its heavy head and resist sudden forces.", [59, 17, 35, 24]],
  ["right", "curved-neck", "A curved neck", "Some dinosaur necks naturally formed an S-shaped curve. Joint shapes and muscle attachments reveal how the neck could move.", [5, 49, 35, 20]],
  ["right", "flexible-and-powerful", "Flexible and powerful", "Small theropods such as Velociraptor had flexible necks for quick strikes. Large predators had stronger neck muscles for handling heavy prey.", [53, 68, 41, 27]],
]);

const page20 = closeReadingPage(20, "38–39", [
  ["left", "backbone-story", "The backbone story", "A large dinosaur's backbone carried an enormous load. Interlocking vertebrae formed a strong bridge between the shoulders and hips, while hollow spaces reduced weight.", [4, 44, 46, 29]],
  ["left", "bony-basket", "Bony basket", "The fused sacral vertebrae of Euoplocephalus formed a strong bony basket above the hips. This helped support the body and protect internal organs.", [5, 78, 27, 17]],
  ["left", "spiny-backbone", "Spiny backbone", "Tall neural spines on the backbone gave muscles a large area to attach. Strong muscles helped stabilize the spine and move the limbs.", [57, 76, 36, 19]],
  ["right", "diplodocus-backbone", "Diplodocus backbone", "The backbone of Diplodocus linked the neck, body, hips, and tail. Different vertebrae were shaped for different jobs.", [4, 5, 64, 35]],
  ["right", "breakthrough-bone", "Breakthrough bone", "A fossil Iguanodon sacrum showed that several vertebrae between the hips were fused. This discovery helped scientists understand the dinosaur body plan.", [58, 5, 36, 16]],
  ["right", "bony-bridge", "Bony bridge", "Diplodocus had a long, flexible bridge of vertebrae. Strong joints and muscles let the backbone support its giant body.", [60, 79, 34, 16]],
]);

const page21 = closeReadingPage(21, "40–41", [
  ["left", "all-about-tails", "All about tails", "Dinosaur tails helped with movement, balance, support, signaling, and defense. Large muscles at the base of the tail also pulled the hind legs backward during each step.", [4, 5, 47, 31]],
  ["left", "rodlike-tail", "Rod-like tail", "Deinonychus had long bony rods and stiff tendons along its tail. The stiff tail acted as a balancing pole when the dinosaur turned quickly.", [54, 4, 39, 18]],
  ["left", "balancing-on-the-move", "Balancing on the move", "Dryosaurus held its tail out behind its body. This counterbalanced its chest and head while it walked or ran on two legs.", [5, 78, 38, 17]],
  ["right", "tails-held-high", "Tails held high", "Fossil trackways rarely show tail-drag marks. This is evidence that dinosaurs normally carried their tails above the ground.", [4, 5, 38, 18]],
  ["right", "longest-tail", "The longest tail", "Diplodocus had about eighty tail vertebrae. Its tail became thinner and lighter toward the tip.", [5, 26, 35, 15]],
  ["right", "double-beam", "Double beam", "Diplodocus had double-beamed chevron bones beneath its tail. These bones protected blood vessels and gave muscles room to attach.", [56, 52, 38, 20]],
  ["right", "rearing-to-feed", "Rearing to feed", "A sauropod may have formed a tripod with its two hind legs and tail. This stable pose let it reach higher vegetation.", [5, 78, 35, 17]],
]);

const page22 = closeReadingPage(22, "42–43", [
  ["left", "terrifying-tails", "Terrifying tails", "Slow plant-eaters often used their tails for defense. Ankylosaurs swung bony clubs, stegosaurs carried spikes, and sauropods could lash long tails at attackers.", [25, 5, 55, 32]],
  ["left", "spiked-tail", "Spiked tail", "Kentrosaurus had long spikes on its tail. A sideways swing could make even a large predator keep its distance.", [5, 43, 30, 18]],
  ["left", "armored-tail", "Armored tail", "Gastonia carried spikes and armor along its body and tail. These structures formed a strong defense against meat-eaters.", [5, 78, 35, 17]],
  ["right", "cracking-the-whip", "Cracking the whip", "A sauropod may have flicked the thin tip of its tail like a whip. The moving tail could warn or strike a nearby attacker.", [5, 5, 41, 16]],
  ["right", "bony-club", "Bony club", "Euoplocephalus had fused bony plates at the end of a stiff tail. Powerful muscles could swing the club into an attacker's legs.", [59, 37, 35, 22]],
  ["right", "lashing-out", "Lashing out", "Modern crocodiles swing their strong tails in water and on land. They show how a muscular reptile tail can become an effective weapon.", [58, 5, 36, 19]],
  ["right", "thorns-on-the-move", "Thorns on the move", "The thorny devil lizard has a spiny tail that helps protect it. Dinosaur tail weapons were much larger and stronger.", [58, 73, 36, 21]],
]);

const page23 = closeReadingPage(23, "44–45", [
  ["left", "plates-and-sails", "Plates and sails", "Rows of plates, sails, humps, and spines made some dinosaurs look spectacular. Scientists study fossils to decide whether these structures helped with display, heat control, or defense.", [4, 5, 50, 31]],
  ["left", "heated-debate", "Heated debate", "Blood vessels ran through Stegosaurus plates. The plates may have released heat, but they were also useful for display and species recognition.", [34, 5, 32, 19]],
  ["left", "sail-back", "Sail back", "Dimetrodon was not a dinosaur, but its tall sail is a useful comparison. Its sail may have helped with temperature control or display.", [5, 43, 28, 18]],
  ["left", "plated-dinosaur", "Plated dinosaur", "Stegosaurus had two rows of plates and a spiked tail. The plates may have changed color when blood flow increased.", [5, 79, 30, 17]],
  ["right", "keeping-cool", "Keeping cool", "Ouranosaurus had long neural spines that supported a sail or ridge. The structure may have helped release heat or display to other animals.", [57, 5, 37, 19]],
  ["right", "double-spikes", "Double spikes", "Amargasaurus had paired spines rising from its neck. They may have supported skin sails or formed horn-covered defensive spikes.", [5, 48, 37, 21]],
  ["right", "hump-backed-mammal", "Hump-backed mammal", "A bison stores energy in muscles and fat around tall shoulder spines. Some dinosaur humps may have had a similar function.", [57, 77, 37, 18]],
]);

const page24 = closeReadingPage(24, "46–47", [
  ["left", "arms-and-hands", "Arms and hands", "Dinosaur arms and hands evolved for grasping, walking, display, digging, and eventually flying. Theropods lost fingers over time, while sauropod forelimbs became strong weight-bearing pillars.", [23, 5, 54, 32]],
  ["left", "armed-and-dangerous", "Armed and dangerous", "Deinocheirus had enormous arms ending in three-fingered hands. Its long claws may have gathered plants or helped with defense.", [5, 5, 22, 24]],
  ["left", "odd-one-out", "Odd one out", "Therizinosaurus belonged to the maniraptoran theropods, but it was a heavy plant-eater. Its hands carried extraordinary long claws.", [39, 48, 25, 20]],
  ["left", "all-purpose-hand", "An all-purpose hand", "Iguanodon could walk on its hands, grasp leaves with flexible fingers, and use its pointed thumb spike for defense.", [5, 78, 39, 17]],
  ["right", "supporting-weight", "Supporting weight", "Camarasaurus had straight, pillar-like forelimbs. Its hand bones formed a compact support for its massive body.", [57, 5, 37, 20]],
  ["right", "raptor-hands", "Raptor hands", "Bambiraptor had long arms and flexible three-fingered hands. Curved claws helped it seize and hold small prey.", [56, 49, 38, 20]],
  ["right", "puny-props", "Puny props", "Tyrannosaurus had tiny but muscular two-fingered arms. One idea is that the arms helped the animal rise from the ground.", [57, 78, 37, 17]],
]);

const page25 = closeReadingPage(25, "48–49", [
  ["left", "claws-and-uses", "Claws and their uses", "Claws reveal how dinosaurs lived. Predators used curved claws to grip prey, while plant-eaters used broad claws for walking, digging, gathering food, or defense.", [4, 5, 51, 34]],
  ["left", "fishy-hunter", "A fishy hunter", "Baryonyx had a huge curved claw on each hand. It may have hooked fish from the water or held them while biting with its long jaws.", [5, 39, 31, 19]],
  ["right", "super-scythes", "Super scythes", "Therizinosaurus had the longest claws known in any dinosaur. It probably used them to pull branches closer, gather leaves, or defend itself.", [57, 5, 37, 21]],
  ["right", "thumb-spike", "A thumb spike", "Iguanodon's pointed thumb was covered by a horny sheath. It may have been a defensive weapon.", [5, 45, 29, 17]],
  ["right", "claws-in-action", "Claws in action", "Deinonychus had a large swiveling claw on each second toe. It could raise the claw while walking and swing it forward when attacking.", [57, 73, 37, 22]],
  ["right", "little-hooves", "Little hooves", "Triceratops carried its weight on blunt hoof-like claws. These sturdy feet evolved from the sharper claws of smaller ancestors.", [5, 79, 36, 16]],
]);

const page26 = closeReadingPage(26, "50–51", [
  ["left", "legs-and-feet", "Legs and feet", "Fast dinosaurs had long lower legs and light, narrow feet. Giant sauropods had thick weight-bearing legs and broad feet. All dinosaurs walked with upright legs and on their toes.", [16, 5, 64, 31]],
  ["left", "built-for-speed", "Built for speed", "Hypsilophodon had long shins and light feet. These proportions helped it run quickly away from predators.", [5, 42, 28, 20]],
  ["left", "great-escape", "The great escape", "Ornithomimus had long legs like an ostrich. It may have been one of the fastest dinosaurs.", [5, 77, 31, 18]],
  ["right", "plodding-giant", "Plodding giant", "Vulcanodon had massive, column-like legs. Its short toes and strong bones supported a very heavy body.", [22, 5, 31, 18]],
  ["right", "feet-compared", "Feet compared", "Theropods stood on three main toes, while sauropod feet were broad and padded. Foot shape matched each dinosaur's weight and way of moving.", [58, 5, 36, 27]],
  ["right", "on-the-run", "On the run", "Scientists debate how fast Tyrannosaurus could run. A fall at high speed would have been dangerous for such a large animal.", [58, 54, 36, 20]],
  ["right", "chickens-in-salt-pan", "Footprints in salt", "Modern bird tracks show a walking pattern similar to many three-toed dinosaur tracks. Birds are living theropods.", [5, 78, 41, 17]],
]);

const page27 = closeReadingPage(27, "52–53", [
  ["left", "ancient-footprints", "Ancient footprints", "Footprints became fossils when tracks in soft mud were buried and hardened into rock. Track shape, spacing, and depth reveal size, speed, direction, and behavior.", [4, 5, 43, 35]],
  ["left", "thunder-foot", "Thunder foot", "A huge sauropod footprint can be wide and deep. Its size shows the tremendous weight carried by the animal.", [5, 39, 26, 17]],
  ["left", "fossil-tracks", "Fossil tracks", "A sequence of footprints is called a trackway. Several trackways together may show animals moving as a group.", [5, 78, 31, 17]],
  ["left", "calculating-size", "Calculating size", "Scientists can estimate a dinosaur's hip height from the length of its footprint. Bigger prints usually belonged to taller animals.", [48, 79, 44, 16]],
  ["right", "clover-leaf-clue", "Clover leaf clue", "Three broad toes made an Iguanodon print look like a clover leaf. Different footprint shapes help identify different track-makers.", [5, 34, 28, 20]],
  ["right", "where-hunters-ran", "Where hunters ran", "Parallel trackways may show several meat-eating dinosaurs moving in the same direction. This could be evidence of group travel or hunting.", [57, 34, 37, 20]],
  ["right", "making-footprints", "How footprints fossilize", "A dinosaur steps in wet mud. Floodwater covers the tracks with new sediment. The layers harden, and erosion later reveals the fossil prints.", [5, 70, 89, 25]],
]);

const page28 = closeReadingPage(28, "54–55", [
  ["left", "tough-skins", "Tough skins", "Dinosaur skin was usually scaly and waterproof. Scales protected the body from injury and drying out, while armor made some dinosaurs difficult to attack.", [20, 5, 53, 26]],
  ["left", "reptilian-skin", "Reptilian skin", "Modern lizard skin has overlapping scales that reduce water loss. Fossil impressions show similar scale patterns in dinosaurs.", [5, 5, 22, 25]],
  ["left", "coat-of-armor", "Coat of armor", "Sauropelta had bony plates called osteoderms embedded in its skin. Spikes and knobs formed a protective coat.", [57, 45, 37, 20]],
  ["right", "knobbled-defense", "Knobbled defense", "A fossil skin impression from a hadrosaur preserves the shapes of many scales. Such fossils reveal texture but usually not color.", [56, 18, 38, 18]],
  ["right", "bony-back", "Bony back", "A thick scute from an armored dinosaur fitted into the skin. Blood-vessel marks show that the plate was living bone.", [5, 43, 33, 19]],
  ["right", "scaly-skin", "Scaly skin", "A cast of Ankylosaurus skin preserves a mosaic of small scales. Flexible skin between the scales allowed the animal to move.", [58, 45, 36, 19]],
  ["right", "well-protected", "Well protected", "Euoplocephalus had armor across its back and a bony club on its tail. Together they formed an effective defense.", [52, 73, 42, 22]],
]);

const page29 = closeReadingPage(29, "56–57", [
  ["left", "feathered-dinosaurs", "Feathered dinosaurs", "Some dinosaurs had down or feathers instead of only scales. Feathers first helped with warmth and display; later, specialized feathers made flight possible.", [4, 17, 52, 28]],
  ["left", "feathered-or-not", "Feathered or not?", "Scientists once doubted that dinosaurs had feathers. Fossils from China later preserved clear feather-like coverings on many theropods.", [5, 52, 28, 17]],
  ["left", "dinobird", "Dinobird", "Caudipteryx had feathers on its arms and tail but could not fly. Its feathers probably kept it warm or helped with display.", [5, 79, 29, 17]],
  ["left", "fuzzy-raptor", "Fuzzy raptor", "Sinosauropteryx had a coat of simple, fuzzy feathers. The fossil shows that feathers began as insulation rather than flight surfaces.", [58, 79, 36, 17]],
  ["right", "early-bird", "An early bird", "Archaeopteryx had flight feathers and wings, but also teeth, claws, and a long bony tail. It links birds with small theropod dinosaurs.", [4, 5, 48, 33]],
  ["right", "flight-feathers", "Flight feathers", "Primary and secondary feathers form broad wing surfaces. Their stiff shafts and asymmetric vanes help a bird push against the air.", [55, 5, 39, 20]],
  ["right", "climbers-and-gliders", "Climbers and gliders", "Some feathered dinosaurs may have climbed trees and glided between branches before powered flight evolved.", [5, 59, 38, 20]],
  ["right", "bird-with-a-beak", "A bird with a beak", "Confuciusornis had a toothless beak and feathered wings. It lived during the Early Cretaceous Period.", [58, 76, 36, 19]],
]);

const page30 = closeReadingPage(30, "58–59", [
  ["left", "eggs-and-young", "Eggs and young", "Dinosaurs hatched from hard-shelled eggs. Fossil eggs, embryos, nests, and growth rings reveal how young dinosaurs developed and whether parents cared for them.", [18, 5, 59, 30]],
  ["left", "giants-eggs", "A giant's eggs", "Even giant sauropods began inside eggs not much larger than a loaf of bread. The young then grew rapidly.", [5, 5, 21, 22]],
  ["left", "stolen-goods", "Stolen goods?", "Oviraptor was first found near eggs and was called egg thief. Later discoveries showed adults sitting on their own nests, so the name was probably unfair.", [5, 59, 28, 22]],
  ["left", "dino-kids", "Dino kids", "Maiasaura means good mother lizard. Nesting colonies suggest that adults guarded nests and fed hatchlings until they were stronger.", [58, 76, 36, 19]],
  ["right", "growing-up", "Growing up", "Growth rings in fossil bones show that Tyrannosaurus grew very quickly during its teenage years and reached adult size in less than two decades.", [5, 5, 45, 20]],
  ["right", "ready-to-hatch", "Ready to hatch", "A fossil Troodon embryo shows bones folded inside an egg. Embryos help scientists understand dinosaur development before hatching.", [5, 36, 39, 18]],
  ["right", "till-death", "Till death do us part", "A sudden mudslide buried an adult Citipati on its nest. Its pose shows that the parent was sheltering the eggs with its arms.", [57, 31, 37, 18]],
]);

const page31 = closeReadingPage(31, "60–61", [
  ["left", "finding-fossils", "Finding dinosaur fossils", "Paleontologists search exposed rocks from the right geological age. A few surface fragments can lead to a larger skeleton hidden in the ground.", [21, 5, 58, 31]],
  ["left", "ancient-treasure-trove", "Ancient treasure trove", "A rock layer may contain bones from many animals. Scientists map each fossil carefully to preserve clues about the original site.", [5, 5, 20, 24]],
  ["left", "the-hunt", "The hunt", "Field teams work in deserts, cliffs, quarries, and cold regions. Safety ropes, careful observation, and patient excavation are essential.", [5, 40, 28, 18]],
  ["right", "the-find", "The find", "When a bone is exposed, the team records its position, photographs it, and clears away loose rock without damaging the fossil.", [5, 5, 33, 18]],
  ["right", "three-field-steps", "Three field steps", "First the fossil is cleaned. Next it is wrapped in a protective plaster jacket. Finally it is transported to a laboratory for study.", [41, 5, 53, 22]],
  ["right", "tools-of-trade", "Tools of the trade", "Paleontologists use hammers, chisels, brushes, glue, plaster, and measuring tools. Each tool is chosen for a different stage of the work.", [5, 42, 89, 52]],
]);

const page32 = closeReadingPage(32, "62–63", [
  ["left", "rebuilding-dinosaur", "Rebuilding a dinosaur", "In a museum laboratory, experts clean and repair bones, compare them with related animals, rebuild the skeleton, and use evidence to create a lifelike model.", [17, 5, 63, 31]],
  ["left", "exposing-fossil", "Exposing the fossil", "A preparator removes rock with small tools. The work must be slow and controlled so the fragile fossil is not damaged.", [5, 5, 20, 23]],
  ["left", "finding-clues", "Finding clues", "Ridges, joints, and attachment marks on bones reveal muscles and movement. Missing parts can sometimes be estimated from related species.", [5, 42, 27, 20]],
  ["left", "on-display", "On display", "Museums often mount casts rather than original fossils. Casts are lighter and protect the real bones for research.", [5, 78, 28, 17]],
  ["left", "flesh-and-bones", "Flesh and bones", "Artists add muscles, skin, color, and posture using scientific evidence. A reconstruction is a careful explanation, not a photograph of the past.", [58, 76, 36, 19]],
  ["right", "digital-dinos", "Digital dinos", "Three-dimensional artists build a digital mesh, shape the body, add skin and color, create movable joints, light the scene, and render the final dinosaur.", [5, 5, 44, 22]],
  ["right", "digital-steps", "Eight digital steps", "The eight panels show base mesh, shaping, correction, UV mapping, color, detail, rigging, and rendering. Each step adds another layer of realism.", [54, 5, 40, 90]],
]);

const page33 = closeReadingPage(33, "64", [
  ["left", "classification", "Classification of dinosaurs", "A species is one kind of organism. Related species form a genus, and connected groups form clades. A cladogram shows how groups share ancestors and branch through time.", [4, 5, 57, 26]],
  ["left", "classification-pioneers", "Pioneers of classification", "Carl Linnaeus developed a system for naming organisms with a genus and species. Modern scientists use shared features to arrange dinosaurs into evolutionary groups.", [60, 5, 34, 23]],
  ["left", "cladogram", "Reading the cladogram", "Follow a branch from the bottom upward. Every split represents a common ancestor, and nearby branches show groups with more features in common.", [5, 31, 89, 63]],
]);

const page34 = closeReadingPage(34, "65–66", [
  ["left", "pronunciation-guide", "Pronunciation guide", "Long dinosaur names become easier when they are broken into sound parts. Say each part clearly, then blend the parts together into the whole name.", [4, 5, 90, 12]],
  ["left", "pronunciation-a-l", "Names from A to L", "Practice names such as Albertosaurus, Allosaurus, Ankylosaurus, Brachiosaurus, Deinonychus, Diplodocus, Iguanodon, Kentrosaurus, and Lambeosaurus.", [5, 17, 43, 76]],
  ["left", "pronunciation-m-z", "Names from M to Z", "Practice names such as Megalosaurus, Oviraptor, Parasaurolophus, Spinosaurus, Stegosaurus, Triceratops, Tyrannosaurus, and Velociraptor.", [49, 17, 45, 76]],
  ["right", "discovery-timeline", "Discovery timeline", "Dinosaur science grew through many discoveries. Each fossil, new method, and new question changed how people pictured these ancient animals.", [5, 5, 54, 25]],
  ["right", "early-discoveries", "Early discoveries", "From the 1600s to the 1800s, scientists described giant fossil bones, named Dinosauria, built models, and found evidence such as eggs, tracks, and feathers.", [5, 29, 43, 64]],
  ["right", "bucklands-work", "William Buckland", "In 1824 William Buckland described Megalosaurus, the first dinosaur to receive a scientific name.", [52, 29, 42, 29]],
  ["right", "later-nineteenth-century", "Later nineteenth century", "New skeletons from Europe and North America revealed many dinosaur groups and showed that early heavy, lizard-like models were incomplete.", [52, 59, 42, 34]],
]);

const page35 = closeReadingPage(35, "67–68", [
  ["left", "timeline-1950s-1970s", "The dinosaur renaissance", "From the 1950s through the 1970s, discoveries and new ideas showed that many dinosaurs were active, agile animals rather than slow, oversized lizards.", [5, 5, 43, 45]],
  ["left", "timeline-1980s-1990s", "New fossils around the world", "Finds from Antarctica, Argentina, China, and other regions revealed giant predators, unusual plant-eaters, nesting behavior, and feathered dinosaurs.", [5, 48, 43, 45]],
  ["left", "timeline-2000s", "Science keeps changing", "New fossils, microscopic studies, and computer analysis continue to test ideas about dinosaur growth, feathers, color, family relationships, and behavior.", [50, 5, 44, 88]],
  ["right", "find-out-more", "Find out more", "Museums, fossil sites, books, documentaries, and guided digs can all help us learn about dinosaurs. Good science sources explain the evidence behind their claims.", [20, 5, 68, 28]],
  ["right", "hunting-for-fossils", "Hunting for fossils", "Fossil hunters search exposed sedimentary rock. Visitors should join safe, guided trips and must follow local rules about collecting fossils.", [5, 5, 22, 26]],
  ["right", "getting-to-know-you", "Getting to know you", "Museum skeletons let us compare the shapes and sizes of many dinosaurs. Labels explain which bones are real and which are casts.", [5, 35, 31, 21]],
  ["right", "join-a-dig", "Join a dig", "Some museums and parks let families watch fossil preparation or join supervised excavations. Careful work matters more than speed.", [5, 74, 31, 20]],
  ["right", "up-close", "Up close and personal", "Life-size models help us imagine skin, muscles, and movement. We should compare models with fossil evidence because some details remain uncertain.", [58, 55, 36, 38]],
]);

const page36 = closeReadingPage(36, "69–70", [
  ["left", "useful-websites", "Useful websites", "Trusted museum and science websites can provide dinosaur articles, virtual fossil halls, videos, and activities. Check who created a page and when it was updated.", [5, 5, 45, 18]],
  ["left", "real-on-reel", "Real on reel", "Films use models and computer images to bring dinosaurs to life. Movie dinosaurs can be exciting, but they do not always match the latest scientific evidence.", [5, 20, 29, 19]],
  ["left", "walking-with-dinosaurs", "Walking with Dinosaurs", "Large moving models can show dinosaur size and motion in a live performance. They are artistic reconstructions based on scientific ideas.", [5, 40, 32, 19]],
  ["left", "places-to-visit", "Places to visit", "Natural history museums and fossil parks display skeletons, tracks, reconstructions, and working laboratories. Each collection tells a different part of the dinosaur story.", [59, 5, 35, 88]],
  ["right", "glossary-a-c", "Glossary: A to C", "Learn key words from ammonite and amphibian to carnivore and ceratopsian. A glossary gives a short, precise meaning for each scientific term.", [5, 5, 30, 89]],
  ["right", "glossary-c-e", "Glossary: C to E", "Terms include cold-blooded, conifer, coprolite, Cretaceous, cycad, dromaeosaurid, embryo, evolution, and extinction.", [35, 5, 29, 89]],
  ["right", "glossary-f-m", "Glossary: F to M", "Terms include fossil, gastrolith, genus, ginkgo, gymnosperm, hadrosaur, herbivore, ichthyosaur, Jurassic, and mammal.", [65, 5, 29, 89]],
]);

const page37 = closeReadingPage(37, "71–72", [
  ["left", "glossary-m-p", "Glossary: M to P", "Terms include maniraptoran, Mesozoic, mollusk, mosasaur, ornithischian, ornithopod, paleontologist, predator, prosauropod, and pterosaur.", [5, 5, 30, 89]],
  ["left", "glossary-p-s", "Glossary: P to S", "Terms include quadrupedal, radioactive element, reptile, saurischian, sauropod, scute, sediment, skull, species, and stegosaur.", [35, 5, 29, 89]],
  ["left", "glossary-t-v", "Glossary: T to V", "Terms include theropod, trace fossil, Triassic, tyrannosaurid, vertebrate, and warm-blooded. Practice using each word in a complete sentence.", [65, 5, 29, 89]],
  ["right", "using-the-index", "How to use the index", "The index lists topics in alphabetical order. Find a word, read its page number, then return to that page to explore the pictures and facts.", [5, 5, 89, 13]],
  ["right", "index-a-l", "Index: A to L", "Use the first half of the index to locate dinosaurs and topics from Acanthostega through lizards.", [5, 18, 45, 55]],
  ["right", "index-m-z", "Index: M to Z", "Use the second half of the index to locate dinosaurs and topics from Maiasaura through Zalambdalestes.", [50, 18, 44, 55]],
  ["right", "acknowledgments", "Acknowledgments", "The acknowledgments record the writers, editors, artists, photographers, museums, and researchers whose work helped create the book.", [5, 75, 89, 20]],
]);

export const DINOSAUR_CLOSE_READING_REMAINING_PAGES: readonly DinosaurCloseReadingPage[] = [
  page15,
  page16,
  page17,
  page18,
  page19,
  page20,
  page21,
  page22,
  page23,
  page24,
  page25,
  page26,
  page27,
  page28,
  page29,
  page30,
  page31,
  page32,
  page33,
  page34,
  page35,
  page36,
  page37,
];
