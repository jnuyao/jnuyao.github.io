export type StoryPage = {
  src: string;
  audioSrc: string | null;
  transcript: string;
};

export type ListenTask = {
  prompt: string;
  audioText: string;
  choices: string[];
  correctAnswer: string;
};

export type SpeakTask = {
  modelLine: string;
  tip: string;
};

export type ReadTask = {
  passage: string;
  question: string;
  choices: string[];
  correctAnswer: string;
};

export type WriteTask = {
  modelSentence: string;
  targetWords: string[];
};

export type BookTasks = {
  listen: ListenTask;
  speak: SpeakTask;
  read: ReadTask;
  write: WriteTask;
};

export type Book = {
  slug: string;
  title: string;
  cover: string;
  colour: string;
  focus: string[];
  level: 1 | 2;
  term: 1 | 2 | 3 | 4;
  unit: number;
  pages: StoryPage[];
  tasks: BookTasks;
};

const makePages = (slug: string, transcripts: string[]): StoryPage[] =>
  transcripts.map((transcript, index) => ({
    src: `/pages/${slug}/${String(index + 1).padStart(2, "0")}.webp`,
    audioSrc: transcript.trim()
      ? `/audio/${slug}/${String(index + 1).padStart(2, "0")}.mp3`
      : null,
    transcript,
  }));

export const BOOKS: Book[] = [
  {
    slug: "dan-the-flying-man",
    title: "Dan, the Flying Man",
    cover: "/books/dan-the-flying-man.jpg",
    colour: "#5B8DEF",
    focus: ["rhyming words", "over", "action words"],
    level: 1,
    term: 1,
    unit: 1,
    pages: makePages("dan-the-flying-man", [
      "Dan, the Flying Man.",
      "I am Dan, the flying man. Catch me, catch me if you can.",
      "Over a house and over a crane.",
      "Over a bridge and over a train.",
      "Over flowers, over trees,",
      "over mountains, over seas.",
      "I am Dan, the flying man. Catch me, catch me if you can.",
      "All the people ran and ran.",
      "They caught Dan, the flying man.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Which words rhyme?",
        audioText: "Dan, man, can. Dan, man, can.",
        choices: ["Dan, man, can", "house, crane, train", "flowers, trees, seas"],
        correctAnswer: "Dan, man, can",
      },
      speak: {
        modelLine: "Catch me, catch me if you can.",
        tip: "Make can rhyme with Dan. Say it with a playful voice!",
      },
      read: {
        passage: "All the people ran and ran. They caught Dan, the flying man.",
        question: "Who caught Dan?",
        choices: ["All the people", "A flying cat", "A giant"],
        correctAnswer: "All the people",
      },
      write: {
        modelSentence: "Dan can fly over a train.",
        targetWords: ["Dan", "can", "fly", "over", "train"],
      },
    },
  },
  {
    slug: "mrs-wishy-washy",
    title: "Mrs Wishy-Washy",
    cover: "/books/mrs-wishy-washy.jpg",
    colour: "#F08A72",
    focus: ["animal words", "action words", "repeated phrases"],
    level: 1,
    term: 1,
    unit: 2,
    pages: makePages("mrs-wishy-washy", [
      "Mrs Wishy-Washy. “Oh, lovely mud,” said the cow,",
      "and she jumped in it. “Oh, lovely mud,” said the pig,",
      "and he rolled in it. “Oh, lovely mud,” said the duck,",
      "and she paddled in it. Along came Mrs Wishy-Washy.",
      "“Just look at you!” she screamed. “In the tub you go.”",
      "In went the cow, wishy-washy, wishy-washy. In went the pig, wishy-washy, wishy-washy.",
      "In went the duck, wishy-washy, wishy-washy. “That's better,” said Mrs Wishy-Washy, and she went into the house.",
      "Away went the cow. Away went the pig. Away went the duck. “Oh, lovely mud,” they said.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Who paddled in the mud?",
        audioText: "The cow jumped. The pig rolled. The duck paddled in the mud.",
        choices: ["The duck", "The cow", "Mrs Wishy-Washy"],
        correctAnswer: "The duck",
      },
      speak: {
        modelLine: "Oh, lovely mud!",
        tip: "Sound happy and excited. Stretch the word lovely.",
      },
      read: {
        passage: "Away went the cow. Away went the pig. Away went the duck. “Oh, lovely mud,” they said.",
        question: "Why is the ending funny?",
        choices: ["The clean animals go back to the mud", "Mrs Wishy-Washy flies away", "The animals make a cake"],
        correctAnswer: "The clean animals go back to the mud",
      },
      write: {
        modelSentence: "The duck paddled in the mud.",
        targetWords: ["The", "duck", "paddled", "mud"],
      },
    },
  },
  {
    slug: "walking-through-jungle",
    title: "Walking Through the Jungle",
    cover: "/books/walking-through-jungle.jpg",
    colour: "#39A96B",
    focus: ["animals", "habitats", "sound words"],
    level: 1,
    term: 1,
    unit: 3,
    pages: makePages("walking-through-jungle", [
      "Walking through the jungle, walking through the jungle, what do you see? What do you see?",
      "I think I see a lion. Roar! Roar! Roar! Chasing after me, chasing after me.",
      "Floating on the ocean, floating on the ocean, what do you see? What do you see?",
      "I think I see a whale. Whoosh! Whoosh! Whoosh! Chasing after me, chasing after me.",
      "Climbing in the mountains, climbing in the mountains, what do you see? What do you see?",
      "I think I see a wolf. Howl! Howl! Howl! Chasing after me, chasing after me.",
      "Swimming in the river, swimming in the river, what do you see? What do you see?",
      "I think I see a crocodile. Snap! Snap! Snap! Chasing after me, chasing after me.",
      "Trekking in the desert, trekking in the desert, what do you see? What do you see?",
      "I think I see a snake. Hiss! Hiss! Hiss! Chasing after me, chasing after me.",
      "Slipping on the iceberg, slipping on the iceberg, what do you see? What do you see?",
      "I think I see a polar bear. Growl! Growl! Growl! Chasing after me, chasing after me.",
      "Running home for supper, running home for supper, where have you been? Where have you been?",
      "I've been around the world and back, I've been around the world and back, and guess what I've seen, and guess what I've seen.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Which animal says “Whoosh”?",
        audioText: "I think I see a whale. Whoosh! Whoosh! Whoosh!",
        choices: ["A whale", "A lion", "A snake"],
        correctAnswer: "A whale",
      },
      speak: {
        modelLine: "I think I see a lion.",
        tip: "Change lion to your favourite animal, then make its sound.",
      },
      read: {
        passage: "I've been around the world and back, and guess what I've seen.",
        question: "Where did the child travel?",
        choices: ["Around the world", "Only through the jungle", "Only to school"],
        correctAnswer: "Around the world",
      },
      write: {
        modelSentence: "I see a whale in the ocean.",
        targetWords: ["I", "see", "whale", "ocean"],
      },
    },
  },
  {
    slug: "to-town",
    title: "To Town",
    cover: "/books/to-town.jpg",
    colour: "#F4B43E",
    focus: ["vehicles", "colours", "in and on"],
    level: 1,
    term: 1,
    unit: 4,
    pages: makePages("to-town", [
      "To Town.",
      "I will go to town on my bulldozer, my big yellow bulldozer. Brr-rrr, brr-rrr, all the way to town.",
      "I will go to town in my fire-engine, my big red fire-engine. Oo-daaah-oooo-aaaah, all the way to town.",
      "I will go to town in my vintage car, my big green vintage car. Toot-a-toot, toot-a-toot, all the way to town.",
      "I will go to town in my helicopter, my big blue helicopter. Choppa-choppa, choppa-choppa, all the way to town.",
      "I will go to town on my motor bike, my big orange motor bike. Brrerm, brrerm, all the way to town.",
      "I will go to town on my jumping stick, my super silver jumping stick. Boing, boing, boing, boing, all the way to town.",
      "All the way to town, and then...",
      "all the way back home again. There are many ways to go to town!",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Which vehicle is big and blue?",
        audioText: "I will go to town in my helicopter, my big blue helicopter.",
        choices: ["The helicopter", "The bulldozer", "The fire-engine"],
        correctAnswer: "The helicopter",
      },
      speak: {
        modelLine: "I will go to town on my motor bike.",
        tip: "Choose in or on, then say your own vehicle.",
      },
      read: {
        passage: "All the way to town, and then all the way back home again.",
        question: "Where did the traveller go at the end?",
        choices: ["Back home", "To the ocean", "Into the jungle"],
        correctAnswer: "Back home",
      },
      write: {
        modelSentence: "I will go to town on my motor bike.",
        targetWords: ["I", "will", "go", "town", "motor", "bike"],
      },
    },
  },
  {
    slug: "the-hungry-giant",
    title: "The Hungry Giant",
    cover: "/books/the-hungry-giant.jpg",
    colour: "#E56A54",
    focus: ["food words", "speech marks", "cause and effect"],
    level: 1,
    term: 2,
    unit: 6,
    pages: makePages("the-hungry-giant", [
      "The Hungry Giant.",
      "“I want some bread!” roared the giant. “Get me some bread, or I'll hit you with my bommy-knocker.” So the people ran and ran and got the giant some bread.",
      "“I want some butter!” roared the giant. “Get me some butter, or I'll hit you with my bommy-knocker.” So the people ran and ran and got the giant some butter.",
      "“I want some honey!” roared the giant. “Get me some honey, or I'll hit you with my bommy-knocker.” So the people ran and ran.",
      "They looked everywhere for honey.",
      "“I want some honey!” roared the giant. “Get me some honey!”",
      "“Get me some honey, or I'll hit you with my bommy-knocker!” The people found a beehive. “Ah! Here is some honey,” they said, and they took it to the giant.",
      "“Here is some honey,” they said. The giant looked at the beehive. “That's not honey!” he said, and he hit it with his bommy-knocker.",
      "The bees zoomed out. They zoomed after the giant. “Ow!” he roared, and he ran and ran, ow, ow, OW, all the way home.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What did the people bring last?",
        audioText: "The people found a beehive. “Ah! Here is some honey,” they said.",
        choices: ["A beehive", "A loaf of bread", "A jar of butter"],
        correctAnswer: "A beehive",
      },
      speak: {
        modelLine: "I want some honey!",
        tip: "Say it once in a giant voice. Then say it again in a kind voice.",
      },
      read: {
        passage: "The giant hit the beehive. The bees zoomed out and chased him all the way home.",
        question: "Why did the bees chase the giant?",
        choices: ["He hit their beehive", "He gave them bread", "He asked them kindly"],
        correctAnswer: "He hit their beehive",
      },
      write: {
        modelSentence: "The giant hit the beehive.",
        targetWords: ["The", "giant", "hit", "beehive"],
      },
    },
  },
  {
    slug: "ants-in-a-hurry",
    title: "Ants in a Hurry",
    cover: "/books/ants-in-a-hurry.jpg",
    colour: "#9A6EDB",
    focus: ["repeated words", "is and are", "sequence"],
    level: 1,
    term: 2,
    unit: 7,
    pages: makePages("ants-in-a-hurry", [
      "Down the dark, dark tunnel, the ants scurry, scurry, scurry.",
      "The Queen is hungry. Hurry, hurry, hurry! The Queen wants her jelly. The Queen wants her honey. Hurry, hurry, hurry!",
      "So down the dark, dark tunnel, the ants scurry, scurry, scurry! The Queen is eating jelly. Nibble, nibble, nibble.",
      "The Queen is drinking honey. Sip, sip, sip. Hush! Hush! Hush!",
      "The Queen is laying her royal eggs. Hush! Hush! Hush!",
      "One by one. Slowly, slowly, out they come. Just look at these eggs.",
      "And more! And more! And more eggs! Out comes a baby ant! It is hungry.",
      "They are hungry too! More and more baby ants are hungry!",
      "Bring them jelly. Bring them honey. Hurry, hurry, hurry! So down the dark, dark tunnel, the ants scurry, scurry, scurry. For the babies are hungry, hungry, hungry!",
      "The end. The baby ants celebrate with lots of jelly.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What do the hungry ants need?",
        audioText: "Bring them jelly. Bring them honey. Hurry, hurry, hurry!",
        choices: ["Jelly and honey", "Bread and butter", "Cake and milk"],
        correctAnswer: "Jelly and honey",
      },
      speak: {
        modelLine: "The baby ants are hungry.",
        tip: "Use is for one ant and are for many ants.",
      },
      read: {
        passage: "Bring them jelly. Bring them honey. Hurry, hurry, hurry!",
        question: "Why are the ants in a hurry?",
        choices: ["The baby ants are hungry", "The Queen wants to fly", "The tunnel is full of water"],
        correctAnswer: "The baby ants are hungry",
      },
      write: {
        modelSentence: "The baby ants are hungry.",
        targetWords: ["The", "baby", "ants", "are", "hungry"],
      },
    },
  },
  {
    slug: "dans-lost-hat",
    title: "Dan's Lost Hat",
    cover: "/books/dans-lost-hat.jpg",
    colour: "#4F9FB0",
    focus: ["position words", "rhyming words", "problem and solution"],
    level: 1,
    term: 2,
    unit: 8,
    pages: makePages("dans-lost-hat", [
      "Dan's Lost Hat.",
      "Dan has lost his flying hat. He looks under the bed. He looks under the mat. He looks on the shelf. He looks on the chair. He looks in the fridge. He looks everywhere.",
      "Dan is feeling sad. His day has turned out bad. He can't find his flying hat, so he can't fly, and that is that!",
      "Soon the news gets around. The flying hat cannot be found.",
      "A man says, “Dan, I'm sad for you. I am sad for myself, too. You have lost your flying hat, and I have lost my tabby cat.”",
      "At that moment, the people stare at something whizzing through the air. It's a large and fluffy tabby cat and it is wearing the flying hat!",
      "“Come down!” cries the man. “Come down!” cries Dan. “Please come down, you tabby cat. You have on my flying hat!”",
      "Cries go up all over town. “Come down, Cat. Come down! Come down!” Dan is quick to think of a trick. He puts some fish in a cat food dish. ZOOM! Down comes the cat in two seconds flat!",
      "The man gets back his tabby cat, Dan gets back his flying hat, and the cat gets tasty fish heaped up in a cat food dish.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Where is Dan's hat?",
        audioText: "It's a large and fluffy tabby cat, and it is wearing the flying hat!",
        choices: ["On the cat", "Under the bed", "In the fridge"],
        correctAnswer: "On the cat",
      },
      speak: {
        modelLine: "Please come down, you tabby cat!",
        tip: "Use a clear asking voice. Make cat rhyme with hat.",
      },
      read: {
        passage: "Dan puts some fish in a cat food dish. Down comes the cat in two seconds flat!",
        question: "What trick gets the cat down?",
        choices: ["Dan puts out some fish", "Dan climbs a tree", "Dan calls the giant"],
        correctAnswer: "Dan puts out some fish",
      },
      write: {
        modelSentence: "The hat is on the cat.",
        targetWords: ["The", "hat", "is", "on", "cat"],
      },
    },
  },
  {
    slug: "baby-sister-came-home",
    title: "When My Baby Sister Came Home",
    cover: "/books/baby-sister-came-home.jpg",
    colour: "#E887B7",
    focus: ["family words", "did and did not", "feelings"],
    level: 1,
    term: 3,
    unit: 9,
    pages: makePages("baby-sister-came-home", [
      "When my baby sister came home... she cried, “Wa-ah!”",
      "“Wa-ah!” my baby sister cried when Mother carried her. “There, there, baby. Don't cry, my baby.”",
      "What a fuss Mother made over her. “Wa-ah!” my baby sister cried when Father carried her.",
      "“Koo-chi, koo-chi, baby!” Listen to Father, talking nonsense again! “Wa-ah!” my baby sister cried when Grandpa carried her.",
      "“Oh, oh! She's done it on me!” “There! That's what babies do! I'd go to the toilet.”",
      "“Wa-ah!” my baby sister cried when Grandma carried her. “There, there, don't you cry. Your brother didn't cry when he came home.”",
      "“Oh no, my grandson. You didn't cry at all. You were a good little baby boy.” “I didn't cry, did I, Grandma? I didn't cry like her, did I?”",
      "“Oh, what a lovely baby sister you have, Hashim. She looks just like you.” “Wa-ah!” my baby sister cried when Aunty Norleen carried her.",
      "“Wa-ah!” my baby sister cried. “Here, why don't you carry her?” So I did. And my baby sister did not cry.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. With whom did the baby stop crying?",
        audioText: "So I carried her. And my baby sister did not cry.",
        choices: ["Her brother Hashim", "Aunty Norleen", "Grandpa"],
        correctAnswer: "Her brother Hashim",
      },
      speak: {
        modelLine: "My baby sister did not cry.",
        tip: "Say did not clearly. Then say the whole sentence smoothly.",
      },
      read: {
        passage: "So I did. And my baby sister did not cry.",
        question: "How might Hashim feel at the end?",
        choices: ["Proud and happy", "Angry with the baby", "Afraid of his family"],
        correctAnswer: "Proud and happy",
      },
      write: {
        modelSentence: "My baby sister did not cry.",
        targetWords: ["My", "baby", "sister", "did", "not", "cry"],
      },
    },
  },
  {
    slug: "mid-autumn-festival",
    title: "Mid-Autumn Festival",
    cover: "/books/mid-autumn-festival.jpg",
    colour: "#D97842",
    focus: ["polite requests", "position words", "story viewpoint"],
    level: 1,
    term: 3,
    unit: 10,
    pages: makePages("mid-autumn-festival", [
      "It was the Mid-Autumn Festival. The street was full of people. “Hold on to my hand,” said Dad to my little sister, Lee Ling.",
      "“I want a tiger lantern. Please, Dad, may I have that tiger lantern?”",
      "Dad got the tiger lantern for me and a rabbit for Lee Ling. We said, “Thank you!” Lee Ling held her rabbit lantern in one hand. Her other hand held on to Dad's hand.",
      "We stopped at the mooncake stall. We all liked mooncakes. Dad liked the ones with egg yolk inside. Dad talked to the mooncake seller. We bought delicious mooncakes for a very good price.",
      "But when Dad looked down, he saw that Lee Ling was gone. Where was Lee Ling? We looked here and we looked over there. We could not see her anywhere!",
      "Dad said, “I told her to hold on to my hand, but I had money in one hand and mooncakes in the other.” We went past the food stalls. “Dim sum!” called a woman. “Nice meat dumplings!”",
      "Dad asked her, “Have you seen a little girl with a rabbit lantern?” “Do you mean this little girl?” said the woman to Dad.",
      "Behind the stall was Lee Ling, sitting on a stool and eating an egg tart. “Hello, Daddy,” she said. At home, Lee Ling said to Mum, “Daddy got lost but I found him again!”",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What did Lee Ling hold?",
        audioText: "Lee Ling held her rabbit lantern in one hand. Her other hand held on to Dad's hand.",
        choices: ["A rabbit lantern", "A tiger toy", "A green packet"],
        correctAnswer: "A rabbit lantern",
      },
      speak: {
        modelLine: "Please, may I have that tiger lantern?",
        tip: "Use a gentle, polite voice. Try again with something you would like.",
      },
      read: {
        passage: "Behind the stall was Lee Ling, sitting on a stool and eating an egg tart.",
        question: "Where was Lee Ling?",
        choices: ["Behind the stall", "Inside a car", "Under a table"],
        correctAnswer: "Behind the stall",
      },
      write: {
        modelSentence: "Lee Ling was behind the stall.",
        targetWords: ["Lee", "Ling", "was", "behind", "stall"],
      },
    },
  },
  {
    slug: "first-day-hari-raya",
    title: "The First Day of Hari Raya",
    cover: "/books/first-day-hari-raya.jpg",
    colour: "#2F9B8B",
    focus: ["celebration words", "polite language", "story sequence"],
    level: 1,
    term: 3,
    unit: 11,
    pages: makePages("first-day-hari-raya", [
      "The First Day of Hari Raya.",
      "Mummy makes breakfast for my sister and me. We are hungry and it is a good breakfast. We have lontong. We have rendang. We have other food. They are all delicious!",
      "“Please get dressed now,” Mummy says to us. “We are going to visit Grandpa and Grandma. Here are your new clothes.”",
      "“Look at my baju kurung!” my sister says to me. “It is green.” “My baju kurung is green too,” I say. “Mine has three pockets.”",
      "My sister and I run to the door. We are in a hurry to see Grandpa and Grandma. “Wait!” Daddy says to us. “Come back! Come back! You need to do something first.”",
      "I kneel down and say, “I'm sorry too, for the times I've been naughty.” I kiss Mummy's and Daddy's hands. My sister kneels down and says, “I'm sorry for the times I've been naughty.” She kisses Daddy's and Mummy's hands.",
      "Now Mummy and Daddy, my sister and I get into the car to go to Grandpa and Grandma's house. All the family members are at the house for the Hari Raya visit.",
      "There is a lot of good food. We eat pineapple tarts, chocolate cookies and rainbow cake.",
      "“Children, come here.” Grandpa and Grandma have green packets for all the grandchildren. I kiss their hands, smile widely and say, “Thank you.”",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What colour is the baju kurung?",
        audioText: "Look at my baju kurung! It is green. My baju kurung is green too.",
        choices: ["Green", "Red", "Blue"],
        correctAnswer: "Green",
      },
      speak: {
        modelLine: "My baju kurung is green.",
        tip: "Say the clothing word slowly. Then practise “I'm sorry” and “Thank you” politely.",
      },
      read: {
        passage: "Grandpa and Grandma have green packets for all the grandchildren. I kiss their hands, smile widely and say, “Thank you.”",
        question: "What does the child say after receiving a green packet?",
        choices: ["Thank you", "Come back", "I am hungry"],
        correctAnswer: "Thank you",
      },
      write: {
        modelSentence: "My baju kurung is green.",
        targetWords: ["My", "baju", "kurung", "is", "green"],
      },
    },
  },
  {
    slug: "lazy-duck",
    title: "Lazy Duck",
    cover: "/books/lazy-duck.jpg",
    colour: "#E0A52D",
    focus: ["days of the week", "farm animals", "repeated rhyme"],
    level: 1,
    term: 4,
    unit: 12,
    pages: makePages("lazy-duck", [
      "Lazy Duck.",
      "Lazy Duck waddled around the farmyard. He watched the animals as they worked.",
      "On Monday, he watched the cat. She prowled up and down looking for mice. Ha, ha, ha, hee, hee, hee! I'm a duck, I'm a duck, I'm a lazy duck. You do the work and I have the luck.",
      "On Tuesday, he watched the hens. They scratched and scraped, and laid big brown eggs for the farmers' tea. Ha, ha, ha, hee, hee, hee! I'm a duck, I'm a duck, I'm a lazy duck. You do the work and I have the luck.",
      "On Wednesday, he watched the dog. He ran up and down and round and round getting the sheep. Ha, ha, ha, hee, hee, hee! I'm a duck, I'm a duck, I'm a lazy duck. You do the work and I have the luck.",
      "On Thursday, he watched the goats. They ran up and down eating weeds and thistles for the farmer. Ha, ha, ha, hee, hee, hee! I'm a duck, I'm a duck, I'm a lazy duck. You do the work and I have the luck.",
      "On Friday, he watched the farmers. They scritched and scratched in the garden with their hoes.",
      "The farmers said, “You know that duck, that lazy duck, I think we'll put it in the pot for tea.”",
      "Lazy Duck ran to tell the animals in the farmyard. “Help me! Help me! Help me, please! The farmers say it's the pot for me!”",
      "“Be a busy duck!”",
      "On Saturday, the farmers went to work in the garden. They saw Lazy Duck cleaning up the beetles and bugs. “I'm a busy duck, I'm a busy, busy duck, I'm the busiest duck you've seen.”",
      "“You're a busy duck,” said the farmers. “A lucky, busy duck. Busy ducks are not for tea.”",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Which animal did Lazy Duck watch on Monday?",
        audioText: "On Monday, Lazy Duck watched the cat. She prowled up and down looking for mice.",
        choices: ["The cat", "The hens", "The dog"],
        correctAnswer: "The cat",
      },
      speak: {
        modelLine: "I'm a duck, I'm a duck, I'm a lazy duck.",
        tip: "Keep the repeated words bouncy and make duck rhyme each time.",
      },
      read: {
        passage: "They saw Lazy Duck cleaning up the beetles and bugs. Busy ducks are not for tea.",
        question: "Why did the farmers let Lazy Duck stay?",
        choices: ["He became busy and helpful", "He hid from them", "He laid brown eggs"],
        correctAnswer: "He became busy and helpful",
      },
      write: {
        modelSentence: "Lazy Duck is a busy duck.",
        targetWords: ["Lazy", "Duck", "is", "a", "busy", "duck"],
      },
    },
  },
  {
    slug: "mr-gumpys-outing",
    title: "Mr Gumpy's Outing",
    cover: "/books/mr-gumpys-outing.jpg",
    colour: "#7CA65D",
    focus: ["polite requests", "rules", "story sequence"],
    level: 2,
    term: 1,
    unit: 3,
    pages: makePages("mr-gumpys-outing", [
      "Mr Gumpy's Outing.",
      "This is Mr Gumpy. Mr Gumpy owned a boat and his house was by a river.",
      "One day Mr Gumpy went out in his boat. “May we come with you?” said the children. “Yes,” said Mr Gumpy, “if you don't squabble.”",
      "“Can I come along, Mr Gumpy?” said the rabbit. “Yes, but don't hop about.”",
      "“I'd like a ride,” said the cat. “Very well,” said Mr Gumpy. “But you're not to chase the rabbit.”",
      "“Will you take me with you?” said the dog. “Yes,” said Mr Gumpy. “But don't tease the cat.”",
      "“May I come, please, Mr Gumpy?” said the pig. “Very well, but don't muck about.”",
      "“Have you a place for me?” said the sheep. “Yes, but don't keep bleating.”",
      "“Can we come too?” said the chickens. “Yes, but don't flap,” said Mr Gumpy.",
      "“Can you make room for me?” said the calf. “Yes, if you don't trample about.”",
      "“May I join you, Mr Gumpy?” said the goat. “Very well, but don't kick.”",
      "For a little while they all went along happily, but then... The goat kicked. The calf trampled. The chickens flapped. The sheep bleated. The pig mucked about. The dog teased the cat. The cat chased the rabbit. The rabbit hopped. The children squabbled. The boat tipped...",
      "",
      "And into the water they fell. Then Mr Gumpy and the goat and the calf and the chickens and the sheep and the pig and the dog and the cat and the rabbit and the children all swam to the bank and climbed out to dry in the hot sun. “We'll walk home across the fields,” said Mr Gumpy. “It's time for tea.”",
      "",
      "“Goodbye,” said Mr Gumpy. “Come for a ride another day.”",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What rule did Mr Gumpy give the children?",
        audioText: "Mr Gumpy said the children could come if they did not squabble.",
        choices: ["Do not squabble", "Do not flap", "Do not kick"],
        correctAnswer: "Do not squabble",
      },
      speak: {
        modelLine: "May we come with you, Mr Gumpy?",
        tip: "Use a polite asking voice and lift your voice slightly at the end.",
      },
      read: {
        passage: "The goat kicked, the calf trampled, the chickens flapped, and the boat tipped.",
        question: "Why did the boat tip?",
        choices: ["Everyone broke the rules", "The river dried up", "Mr Gumpy jumped out"],
        correctAnswer: "Everyone broke the rules",
      },
      write: {
        modelSentence: "The children sat in Mr Gumpy's boat.",
        targetWords: ["The", "children", "sat", "in", "Mr", "Gumpy's", "boat"],
      },
    },
  },
  {
    slug: "a-day-in-the-kitchen-with-grandma",
    title: "A Day in the Kitchen with Grandma",
    cover: "/books/a-day-in-the-kitchen-with-grandma.jpg",
    colour: "#D97958",
    focus: ["cooking words", "time order", "family"],
    level: 2,
    term: 1,
    unit: 4,
    pages: makePages("a-day-in-the-kitchen-with-grandma", [
      "A Day in the Kitchen with Grandma.",
      "I help Grandma in the kitchen. We lay out flour, water and salt. Grandma mixes the flour, water and salt to make dough. I make my dough into a bear!",
      "Grandma uses her hands to shape the dough. Grandma says, “We can use this dough to make noodles later.” Grandma puts the dough in a large bowl and covers it with a kitchen towel.",
      "Grandma says, “Let's make rice dumplings!” She puts a large bowl of rice, a bowl of meat and some bamboo leaves on the table. Grandma takes a small bowl of rice from the refrigerator.",
      "Grandma says, “Yesterday, I crushed the petals from a few blue flowers. I boiled the petals in water. Then I soaked some rice in the blue water.” Grandma makes the rice dumplings. She says, “The Chinese call this zòngzi.” I put my bear in the bowl with the rice. Grandma wraps it up without looking.",
      "The dumplings go into a large pot. They get boiled in water. They take two hours to be cooked. I am hungry.",
      "It is half past twelve. The dumplings are ready! Grandma removes the bamboo leaves from a dumpling and takes a bite. She stops chewing. Grandma pulls out a half-eaten bear. She laughs.",
      "I bite into a dumpling. I bite something hard. I pull out a tooth. I laugh. Grandma puts my tooth in the water with the crushed petals. The tooth will be stained a pretty blue.",
      "Grandma takes out the dough and we start to make noodles. I love helping Grandma in the kitchen.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What does Grandma mix to make dough?",
        audioText: "Grandma mixes flour, water and salt to make dough.",
        choices: ["Flour, water and salt", "Rice, meat and leaves", "Eggs, milk and sugar"],
        correctAnswer: "Flour, water and salt",
      },
      speak: {
        modelLine: "Let's make rice dumplings!",
        tip: "Sound excited, then say rice dumplings clearly in two parts.",
      },
      read: {
        passage: "Grandma pulls out a half-eaten bear. She laughs.",
        question: "How did the dough bear get into the dumpling?",
        choices: ["Grandma wrapped it up without looking", "It jumped into the pot", "The child hid it in the refrigerator"],
        correctAnswer: "Grandma wrapped it up without looking",
      },
      write: {
        modelSentence: "Grandma and I make noodles.",
        targetWords: ["Grandma", "and", "I", "make", "noodles"],
      },
    },
  },
  {
    slug: "life-in-a-shell",
    title: "Life in a Shell",
    cover: "/books/life-in-a-shell.jpg",
    colour: "#4B9AA7",
    focus: ["information text", "animal features", "facts"],
    level: 2,
    term: 2,
    unit: 6,
    pages: makePages("life-in-a-shell", [
      "Life in a Shell.",
      "Life in a Shell. Contents. Creatures in Shells, page two. Snails, page four. Turtles and Tortoises, page six. Crabs and Lobsters, page eight. Hermit Crabs, page ten. Open and Shut, page twelve. On the Beach, page fourteen. Index, page sixteen.",
      "Creatures in Shells. Some creatures have shells. Their shells protect them.",
      "",
      "Snails. A snail has a shell on its back. When there is danger, a snail pulls its whole body inside its shell.",
      "Sea snail. Do you know? As a snail grows, its shell grows bigger, too.",
      "Turtles and Tortoises. A turtle has a shell on its back and under its body. When there is danger, a turtle pulls its head and legs inside its shell. Do you know? A tortoise is a kind of turtle. Tortoises live on the land.",
      "Do you know? Turtles and tortoises have patterns on their shells. No two shells have exactly the same pattern. Turtles. Tortoises.",
      "Crabs and Lobsters. Lobsters have shells that cover them all over. So do most crabs. Crab. Do you know? The shell of a crab or a lobster is called an exoskeleton. This means it is a skeleton outside the creature's body.",
      "Lobster.",
      "Hermit Crabs. A hermit crab does not have a shell on its body. Hermit crabs live in other creatures' empty shells. Do you know? When a hermit crab grows bigger, it moves to a bigger shell.",
      "",
      "Open and Shut. Some shellfish have shells that can open and shut. When the shellfish is in danger, it snaps its shell shut! Do you know? Sea otters eat shellfish. They use a rock to open the shell.",
      "Clam. Scallops. Mussels. Oysters.",
      "On the Beach. Some shells on the beach still have creatures living in them. They need to be under water for several hours a day. This happens when the tide comes in.",
      "Notice. Do not take shells from this beach. Living creatures may still be inside!",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What do shells do for creatures?",
        audioText: "Some creatures have shells. Their shells protect them.",
        choices: ["Shells protect them", "Shells feed them", "Shells make them fly"],
        correctAnswer: "Shells protect them",
      },
      speak: {
        modelLine: "A snail pulls its whole body inside its shell.",
        tip: "Say the two words snail and shell with a clear final sound.",
      },
      read: {
        passage: "A hermit crab does not have a shell on its body. Hermit crabs live in other creatures' empty shells.",
        question: "Where does a hermit crab find its shell?",
        choices: ["From another creature's empty shell", "It grows one on its back", "From a turtle"],
        correctAnswer: "From another creature's empty shell",
      },
      write: {
        modelSentence: "A shell protects the creature inside.",
        targetWords: ["A", "shell", "protects", "the", "creature", "inside"],
      },
    },
  },
  {
    slug: "the-growl",
    title: "The Growl",
    cover: "/books/the-growl.jpg",
    colour: "#7056A5",
    focus: ["rhyming poem", "sound words", "inference"],
    level: 2,
    term: 2,
    unit: 7,
    pages: makePages("the-growl", [
      "The Growl.",
      "Grrr! It started very softly. Was it something in the air? I heard a little rumble as I sat upon my chair. “What could it be?” I wondered. “What could make that scary noise?” I looked around the classroom at the other girls and boys.",
      "Grrrr! It grew a little louder, and Miss Jones gave me a look. The sound of rumbling thunder... Was it coming from my book? Miss Jones said, “Listen, children! Come and sit here on the mat. We have a little problem.” So the whole class came and sat.",
      "Grrrrr! The growl seemed to echo through my ears and eyes and nose. Where could it be going? From my head down to my toes! Then suddenly Miss Jones jumped up and peeped around the door. She said, “Be quiet everyone, I heard a lion roar!”",
      "Grrrrrr! The growl was growing bigger. It was sounding really wild. Was it coming from a grizzly bear? It couldn't be a child! Miss Jones said, “There's that noise again. Whatever can we do?” And then she winked at me and said, “I think it came from you!”",
      "Grrrrrrr! “Miss Jones, I am so hungry I could eat a horse!” I said. “I am so hungry I could eat an elephant instead!” My tummy kept on growling and the sound was huge, not small. I thought a girl behind me said, “She's going to eat us all!”",
      "Grrrrrrrp! “Oh dear, I am so hungry, I could eat a great white shark!” “Oh no, I am so hungry, I could eat a wildlife park!” “Bring me...” I yelled at everyone, “a brontosaurus chop!” But the rumbling kept on grumbling. Would it never ever stop? And then...",
      "Brrrrrrrrring! Brrrrrrrrring! I heard another noise. It hit me like a punch! Miss Jones said, “There's the bell now! Please go and eat your lunch.”",
      "Hurray!",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What was making the growling noise?",
        audioText: "The girl's tummy kept on growling because she was very hungry.",
        choices: ["Her hungry tummy", "A lion", "A grizzly bear"],
        correctAnswer: "Her hungry tummy",
      },
      speak: {
        modelLine: "I am so hungry I could eat a horse!",
        tip: "Start smoothly, then make horse strong and clear without shouting.",
      },
      read: {
        passage: "Miss Jones said, “There's the bell now! Please go and eat your lunch.”",
        question: "Why did the girl shout “Hurray”?",
        choices: ["It was time to eat", "A lion came in", "The class went home"],
        correctAnswer: "It was time to eat",
      },
      write: {
        modelSentence: "My tummy growls when I am hungry.",
        targetWords: ["My", "tummy", "growls", "when", "I", "am", "hungry"],
      },
    },
  },
  {
    slug: "magnetic-max",
    title: "Magnetic Max",
    cover: "/books/magnetic-max.jpg",
    colour: "#348E9D",
    focus: ["cause and effect", "metal objects", "dialogue"],
    level: 2,
    term: 3,
    unit: 9,
    pages: makePages("magnetic-max", [
      "Magnetic Max.",
      "There is a tree in our street that is not like any other tree. Odd things happen when people walk under this tree.",
      "One morning, Joe was walking to the park. He walked under the tree. Then the most amazing thing happened. The paper clips in his pocket flew up into the tree. Now that was odd!",
      "Joe looked up into the tree. It looked just like a tree should look. He touched the tree. It felt just like a tree should feel. But there was no sign of his paper clips. So Joe ran. There was no way he was going to stay under that tree.",
      "Later that morning, Julia was walking her dog. They walked under the tree. Julia had a bunch of keys in her bag. The keys went flying into the tree. Julia had never seen anything like it.",
      "She stopped and looked up into the tree. “Hey, my keys just flew up into this tree,” she said. Her dog looked up into the tree, too. While she was wondering what to do next, Felix came past.",
      "Felix stopped and hopped off his skateboard. “What's the matter?” he asked. But before Julia had time to answer, the iron bolts on his skateboard came out and flew up into the tree.",
      "“This must be the odd tree that everyone is talking about,” said Felix. “Don't worry, I think I know what the trouble is.” So this time they both looked very carefully up into the tree. Right at the very top, hidden by the branches was...",
      "Max, holding an enormous magnet. “Hi, guys,” he said. “Just call me Magnetic Max.” And from that day on, that was his new name.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Which objects flew into the tree?",
        audioText: "Paper clips, keys and iron bolts flew up into the tree.",
        choices: ["Metal objects", "Leaves and flowers", "Dogs and skateboards"],
        correctAnswer: "Metal objects",
      },
      speak: {
        modelLine: "Just call me Magnetic Max.",
        tip: "Say Magnetic in three clear beats: mag-net-ic.",
      },
      read: {
        passage: "Right at the very top, hidden by the branches was Max, holding an enormous magnet.",
        question: "Why did the metal objects fly into the tree?",
        choices: ["Max had a magnet", "The wind was strong", "The tree was moving"],
        correctAnswer: "Max had a magnet",
      },
      write: {
        modelSentence: "The magnet pulled the keys into the tree.",
        targetWords: ["The", "magnet", "pulled", "the", "keys", "into", "tree"],
      },
    },
  },
  {
    slug: "the-feast",
    title: "The Feast",
    cover: "/books/the-feast.jpg",
    colour: "#7BA247",
    focus: ["invitations", "repetition", "cooperation"],
    level: 2,
    term: 3,
    unit: 11,
    pages: makePages("the-feast", [
      "The Feast.",
      "Dinosaur Feast. Saturday at my place. Everyone can come!",
      "Dinosaur thumped into town, shouting, “A feast, a feast! Come to a feast! Come to my dinosaur feast! There'll be eggs and fruit, juice and jam, tasty cakes and delicious ham! Come to my dinosaur feast!”",
      "Dragon Feast. Saturday. Cave Three.",
      "Dragon flapped into town, shouting, “A feast, a feast! Come to a feast! Come to my dragon feast! There'll be pies and icicles, tasty cheese, rhubarb cakes and more to please! Come to my dragon feast!”",
      "Dinosaur Feast. Saturday at my place. Everyone must come!",
      "Dinosaur was cross. He flapped back into town, swooshing his dinosaur tail. “A feast, a feast! Come to a feast! Come to my dinosaur feast! There'll be pterosaur pie and tyrannosaurus cake, with lemon and lime juice—the best you can make! Come to my dinosaur feast!”",
      "Dragon Feast. Saturday. Cave Three. Be there!",
      "Dragon was furious. She stamped back into town, blowing fire and smoke. “A feast, a feast! Come to a feast! Come to my fabulous feast! There'll be pumpkin pie and homemade stew, and toffee apples by the hundreds too! Come to my dragon feast!”",
      "",
      "Dinosaur was sad. He went home with tears in his dinosaur eyes.",
      "",
      "Dragon went home too. She thought and thought. Then she had an idea. “We will have a Dragon and Dinosaur Feast,” she said. “I will make invitations.” The invitations said... Come to a Dragon and Dinosaur Feast. When: Saturday night at midnight. Place: Lake Landing, Site One. Dragons and dinosaurs only. Bring some food.",
      "So Dragon and Dinosaur had a fabulous feast. And what a feast it was!",
      "Feast Food. Eggs and fruit, juice and jam, tasty cakes and delicious ham! Pies and icicles, tasty cheese, rhubarb cakes and more to please! Pterosaur pie and tyrannosaurus cake with lemon and lime juice—the best you can make! Pumpkin pie and homemade stew, and toffee apples by the hundreds, too!",
      "Everyone danced and pranced, bopped and swung, and flapped and flew by the light of the moon...",
      "And there was just one problem—it was over too soon!",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. Where was the shared feast held?",
        audioText: "The Dragon and Dinosaur Feast was at Lake Landing, Site One, on Saturday night at midnight.",
        choices: ["Lake Landing", "Dinosaur's house", "Cave Three"],
        correctAnswer: "Lake Landing",
      },
      speak: {
        modelLine: "Come to a Dragon and Dinosaur Feast!",
        tip: "Use an inviting voice and keep Dragon and Dinosaur clear.",
      },
      read: {
        passage: "Dragon thought and thought. Then she had an idea. They would have a Dragon and Dinosaur Feast.",
        question: "How did Dragon solve the problem?",
        choices: ["They held one feast together", "She cancelled every feast", "She ate all the food alone"],
        correctAnswer: "They held one feast together",
      },
      write: {
        modelSentence: "Dragon and Dinosaur shared a fabulous feast.",
        targetWords: ["Dragon", "and", "Dinosaur", "shared", "a", "fabulous", "feast"],
      },
    },
  },
  {
    slug: "willy-and-hugh",
    title: "Willy and Hugh",
    cover: "/books/willy-and-hugh.jpg",
    colour: "#547B9B",
    focus: ["friendship", "dialogue", "character change"],
    level: 2,
    term: 4,
    unit: 12,
    pages: makePages("willy-and-hugh", [
      "Willy and Hugh.",
      "Willy was lonely.",
      "Everyone seemed to have friends. Everyone except Willy.",
      "No one let him join in any games; they all said he was useless.",
      "One day Willy was walking in the park, minding his own business, and Hugh Jape was running. Smack! They met.",
      "“Oh, I'm so sorry,” said Hugh. Willy was amazed. “But I'm sorry,” he said. “I wasn't watching where I was going.” “No, it was my fault,” said Hugh. “I wasn't looking where I was going. I'm sorry.” Hugh helped Willy to his feet.",
      "They sat down on a bench and watched the joggers. “Looks like they're really enjoying themselves,” said Hugh. Willy laughed.",
      "Buster Nose appeared. “I've been looking for you, little wimp,” he sneered. Hugh stood up. “Can I be of any help?” he asked. Buster left. Very quickly.",
      "So Willy and Hugh decided to go to the zoo.",
      "Then they went to the library, and Willy read to Hugh.",
      "As they were leaving the library, Hugh stopped suddenly. He'd seen a terrifying creature!",
      "“Can I be of any help?” asked Willy, and he carefully moved the spider out of the way. Willy felt quite pleased with himself. “Shall we meet again tomorrow?” asked Hugh. “Yes, that would be great,” said Willy.",
      "And it was.",
    ]),
    tasks: {
      listen: {
        prompt: "Listen. What did Hugh do after bumping into Willy?",
        audioText: "Hugh said he was sorry and helped Willy to his feet.",
        choices: ["He apologised and helped", "He ran away", "He laughed at Willy"],
        correctAnswer: "He apologised and helped",
      },
      speak: {
        modelLine: "Oh, I'm so sorry. I wasn't looking where I was going.",
        tip: "Use a sincere, gentle voice and pause after sorry.",
      },
      read: {
        passage: "Willy carefully moved the spider out of the way. Willy felt quite pleased with himself.",
        question: "How did Willy help Hugh?",
        choices: ["He moved the spider", "He chased Buster", "He read a map"],
        correctAnswer: "He moved the spider",
      },
      write: {
        modelSentence: "Willy and Hugh became good friends.",
        targetWords: ["Willy", "and", "Hugh", "became", "good", "friends"],
      },
    },
  },
];
