export type StoryPage = {
  src: string;
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
  term: 1 | 2 | 3;
  unit: number;
  pages: StoryPage[];
  tasks: BookTasks;
};

const makePages = (slug: string, transcripts: string[]): StoryPage[] =>
  transcripts.map((transcript, index) => ({
    src: `/pages/${slug}/${String(index + 1).padStart(2, "0")}.webp`,
    transcript,
  }));

export const BOOKS: Book[] = [
  {
    slug: "dan-the-flying-man",
    title: "Dan, the Flying Man",
    cover: "/books/dan-the-flying-man.jpg",
    colour: "#5B8DEF",
    focus: ["rhyming words", "over", "action words"],
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
];
