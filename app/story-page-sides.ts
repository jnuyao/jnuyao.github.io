export type StoryPageLayout = "single" | "spread";

export type StoryPageSide = {
  transcript: string;
  audioSrc: string | null;
};
export type StoryPageSides = {
  left: StoryPageSide;
  right: StoryPageSide;
};

type PageSidePlan = null | number | readonly [left: string, right: string];

// Audited against all 533 story images. null means a true single page;
// a number splits canonical text; a tuple preserves the three scans whose
// physical left/right reading order differs from the stored whole-page text.
const STORY_PAGE_SIDE_PLANS: Record<string, readonly PageSidePlan[]> = {
  "dan-the-flying-man": [0,25,12,13,13,15,25,14,32],
  "mrs-wishy-washy": [16,21,20,22,33,42,43,57],
  "walking-through-jungle": [55,39,45,46,53,39,45,44,47,40,49,48,49,73],
  "to-town": [8,59,60,62,59,61,69,20,28],
  "the-hungry-giant": [0,98,100,98,22,38,59,65,116],
  "ants-in-a-hurry": [0,41,63,43,35,42,34,20,56,52],
  "dans-lost-hat": [0,76,47,58,122,71,113,138,120],
  "baby-sister-came-home": [32,54,33,67,30,55,["“I didn't cry, did I, Grandma? I didn't cry like her, did I?”","“Oh no, my grandson. You didn't cry at all. You were a good little baby boy.”"],["“Wa-ah!” my baby sister cried when Aunty Norleen carried her.","“Oh, what a lovely baby sister you have, Hashim. She looks just like you.”"],63],
  "mid-autumn-festival": [0,0,81,98,56,101,67,99],
  "first-day-hari-raya": [null,85,115,62,78,["My sister kneels down and says, “I'm sorry for the times I've been naughty.” She kisses Daddy's and Mummy's hands.","I kneel down and say, “I'm sorry too, for the times I've been naughty.” I kiss Mummy's and Daddy's hands."],91,88,143],
  "lazy-duck": [null,77,72,106,91,97,94,96,50,0,105,89],
  "the-kings-cake": [0,121,131,83,136,82,135,64,80,136,41,96],
  "chicken-rice": [0,185,74,236,241,244,101,141,null],
  "marvel-3-tales-of-adventure": [29,29,19,21,34,60,80,43,65,21,27,0,28,57,38,0,16,23,24,61,54,0,88,85,96,38,109,77,69,49,41,0,53,13,42,43,47,16,31,25,20,36,27,0,0,0,46,0,39,0],
  "dinosaur-david-lambert": [29,104,96,116,101,116,98,97,99,105,112,109,109,94,115,99,105,114,99,110,114,99,91,102,110,95,105,96,104,90,97,99,112,117,120,119,105],
  "mr-gumpys-outing": [null,null,51,128,74,98,91,80,74,75,77,71,271,0,271,0,null],
  "a-day-in-the-kitchen-with-grandma": [null,64,103,125,145,60,135,75,96],
  "life-in-a-shell": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  "the-growl": [null,106,123,122,126,117,124,76,null],
  "magnetic-max": [null,62,67,169,112,132,75,122,null],
  "the-feast": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  "willy-and-hugh": [null,0,55,63,64,227,124,75,43,54,56,86,11],
  "the-gruffalo": [null,0,177,0,183,0,179,261,233,171,164,167,null],
  "predators-and-prey": [null,69,172,182,158,0,47,0,0,0,113],
  "the-stars-of-chek-jawa": [null,0,624,625,565],
  "dinosaur-school": [null,null,451,339,176,224,418,370,356,331,498,494,299,390,null],
  "danny-dinosaur-goes-to-camp": [null,null,0,95,75,61,76,61,87,36,49,32,47,53,72,46,null],
  "danny-dinosaur-school-days": [null,null,61,78,0,115,67,50,71,31,49,98,45,62,0,89,null],
  "santas-moose": [null,null,null,58,67,51,102,110,50,113,33,29,67,130,304,121,null],
  "horse-in-harrys-room": [null,null,null,77,106,87,60,82,86,164,286,115,105,25,71,116,null],
  "danny-dinosaur-too-tall": [null,0,113,78,0,67,62,111,0,81,35,57,0,61,98,47,null],
  "danny-dinosaur-sand-castle-contest": [null,0,104,107,84,263,86,100,94,105,84,126,81,32,54,0,null],
  "danny-dinosaur-new-puppy": [null,0,105,35,29,33,0,75,81,99,78,42,105,60,46,81,null],
  "sammy-the-seal": [null,0,47,25,30,69,88,110,90,68,35,49,77,99,72,59,37,100,44,28,29,53,76,53,62,24,33,34,103,207,84,null],
  "danny-dinosaur-mind-manners": [null,null,90,72,103,156,0,63,0,122,75,136,0,204,106,71,null],
  "danny-dinosaur-ride-a-bike": [null,null,117,73,96,82,85,62,92,75,98,87,83,119,117,114,null],
};

const pageNumber = (pageIndex: number) => String(pageIndex + 1).padStart(2, "0");

const sideFor = (slug: string, pageIndex: number, side: "left" | "right", transcript: string): StoryPageSide => ({
  transcript,
  audioSrc: transcript.trim()
    ? `/audio/${slug}/${pageNumber(pageIndex)}-${side}.mp3`
    : null,
});

export const storyPageSidesFor = (
  slug: string,
  pageIndex: number,
  transcript: string,
): { layout: StoryPageLayout; sides: StoryPageSides | null } => {
  const bookPlan = STORY_PAGE_SIDE_PLANS[slug];
  if (!bookPlan || pageIndex < 0 || pageIndex >= bookPlan.length) {
    throw new Error(`Missing audited page-side plan for ${slug} page ${pageIndex + 1}.`);
  }
  const plan = bookPlan[pageIndex];
  if (plan === null) return { layout: "single", sides: null };

  const [leftTranscript, rightTranscript] = typeof plan === "number"
    ? [transcript.slice(0, plan).trim(), transcript.slice(plan).trim()]
    : plan;
  return {
    layout: "spread",
    sides: {
      left: sideFor(slug, pageIndex, "left", leftTranscript),
      right: sideFor(slug, pageIndex, "right", rightTranscript),
    },
  };
};
