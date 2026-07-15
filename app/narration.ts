export const DEFAULT_NARRATION_RATE = 0.68;
export const PREPARED_AUDIO_CACHE_VERSION = "pro-aoede-words-v2";

export type NarrationPace = "child" | "standard";
export type NarrationPurpose = "story" | "practice";
export type NarrationSegment = {
  text: string;
  kind: "narration" | "dialogue";
  pauseAfterMs: number;
  rateMultiplier: number;
  pitch: number;
};

export type VoiceDescriptor = {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
};

export const NARRATION_PACES: Record<
  NarrationPace,
  { label: string; shortLabel: string; description: string; rate: number }
> = {
  child: {
    label: "Child slow · 儿童慢速 — best for P1",
    shortLabel: "Child slow · 儿童慢速",
    description: "Extra time to hear, point and read along.",
    rate: DEFAULT_NARRATION_RATE,
  },
  standard: {
    label: "Standard story pace · 标准版",
    shortLabel: "Standard · 标准版",
    description: "The storyteller's natural original reading.",
    rate: 0.76,
  },
};

export function normaliseNarrationPace(value: unknown): NarrationPace {
  if (value === "standard" || value === "story") return "standard";
  if (value === "child" || value === "gentle" || value === "practice") return "child";
  return "child";
}

export function preparedAudioSource(source: string, pace: NarrationPace): string {
  const path = source.split(/[?#]/, 1)[0];
  const storyMatch = path.match(/^\/audio(?:-standard)?\/(.+\.mp3)$/);
  if (storyMatch) {
    const root = pace === "standard" ? "/audio-standard/" : "/audio/";
    return `${root}${storyMatch[1]}?v=${PREPARED_AUDIO_CACHE_VERSION}`;
  }
  const wordMatch = path.match(/^\/word-audio(?:-standard)?\/(.+\.mp3)$/);
  if (wordMatch) {
    const root = pace === "standard" ? "/word-audio-standard/" : "/word-audio/";
    return `${root}${wordMatch[1]}?v=${PREPARED_AUDIO_CACHE_VERSION}`;
  }
  return source;
}

const QUALITY_VOICE_NAMES =
  /enhanced|premium|neural|natural|siri|google|microsoft|shelley|flo|sandy|samantha|karen|moira|serena|ava|tessa|fiona|aria|jenny/i;
const GOOD_STORY_VOICE_NAMES =
  /grandma|grandpa|eddy|reed|rocko|daniel|oliver|alex|susan|zira/i;
const NOVELTY_VOICE_NAMES =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|superstar|trinoids|whisper|wobble|zarvox/i;

export function voiceQualityScore(voice: VoiceDescriptor): number {
  const lang = voice.lang.toLowerCase();
  if (!lang.startsWith("en")) return Number.NEGATIVE_INFINITY;

  let score = 100;
  if (QUALITY_VOICE_NAMES.test(voice.name)) score += 170;
  else if (GOOD_STORY_VOICE_NAMES.test(voice.name)) score += 90;
  if (NOVELTY_VOICE_NAMES.test(voice.name)) score -= 500;
  if (/compact/i.test(`${voice.name} ${voice.voiceURI}`)) score -= 35;

  // Quality matters more than accent. Locale only breaks ties between good voices.
  if (lang === "en-sg") score += 34;
  else if (lang.startsWith("en-gb")) score += 30;
  else if (lang.startsWith("en-au")) score += 27;
  else if (lang.startsWith("en-ie")) score += 25;
  else if (lang.startsWith("en-us")) score += 22;
  if (voice.localService) score += 12;
  if (voice.default) score += 5;
  return score;
}

export function rankEnglishVoices<T extends VoiceDescriptor>(voices: T[]): T[] {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((left, right) => {
      const scoreDifference = voiceQualityScore(right) - voiceQualityScore(left);
      return scoreDifference || left.name.localeCompare(right.name);
    });
}

export function prepareSpeechText(text: string): string {
  return text
    .replace(/wishy-washy/gi, "wishy washy")
    .replace(/bommy-knocker/gi, "bommy knocker")
    .replace(/oo-daaah-oooo-aaaah/gi, "oo daah, oo aaah")
    .replace(/brr-rrr/gi, "brrrr")
    .replace(/brrerm/gi, "brrroom")
    .replace(/toot-a-toot/gi, "toot toot")
    .replace(/choppa-choppa/gi, "choppa choppa")
    .replace(/wa-ah/gi, "wah")
    .replace(/koo-chi/gi, "koo chee")
    .replace(/\s+/g, " ")
    .trim();
}

function sentencePause(text: string, kind: NarrationSegment["kind"], purpose: NarrationPurpose) {
  const ending = text.trim();
  let pauseAfterMs = ending.endsWith("...") || ending.endsWith("…")
    ? 700
    : ending.endsWith("?")
      ? 580
      : ending.endsWith("!")
        ? 500
        : /[,;:]$/.test(ending)
          ? 280
          : 430;
  if (kind === "dialogue") pauseAfterMs += 90;
  if (purpose === "practice") pauseAfterMs = Math.round(pauseAfterMs * 0.58);
  return pauseAfterMs;
}

function splitLongSentence(text: string): string[] {
  if (text.length < 125) return [text];
  const phrases = text.match(/[^,;:]+(?:[,;:]|$)/g)?.map((item) => item.trim()).filter(Boolean);
  return phrases && phrases.length > 1 ? phrases : [text];
}

export function buildStoryNarrationSegments(
  source: string,
  purpose: NarrationPurpose = "story",
): NarrationSegment[] {
  const text = source.replace(/\s+/g, " ").trim();
  if (!text) return [];

  const quotedAndNarrated = text
    .split(/(“[^”]+”|"[^"]+")/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const segments: NarrationSegment[] = [];

  for (const part of quotedAndNarrated) {
    const isDialogue = /^(?:“|")/.test(part) && /(?:”|")$/.test(part);
    const kind: NarrationSegment["kind"] = isDialogue ? "dialogue" : "narration";
    const withoutQuotes = isDialogue ? part.slice(1, -1).trim() : part;
    const sentences = withoutQuotes.match(/[^.!?…]+(?:\.{3}|[.!?…]+|$)/g) ?? [withoutQuotes];

    for (const sentence of sentences.flatMap((item) => splitLongSentence(item.trim()))) {
      const spoken = prepareSpeechText(sentence);
      if (!spoken) continue;
      segments.push({
        text: spoken,
        kind,
        pauseAfterMs: sentencePause(sentence, kind, purpose),
        rateMultiplier: kind === "dialogue" ? 0.96 : 1,
        pitch: kind === "dialogue" ? 1.03 : 0.99,
      });
    }
  }

  return segments;
}
