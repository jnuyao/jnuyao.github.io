# Story Garden · Primary English

An interactive, local-first learning site built from thirty-two Primary 1, Primary 2 and Primary 3 picture books. Children can read each story, practise five story-grounded words, listen and speak, then complete spelling and dictation activities before their Word Garden blooms.

## Learning flow

1. **Read** — view the original picture-book pages with prepared narration.
2. **Learn words** — see five core words in their original page context, with sound chunks, simple English meaning and Chinese support.
3. **Say** — hear a clear model, read aloud, and optionally record a short voice mirror for local playback.
4. **Spell** — type or build the hidden word from shuffled letter tiles after hearing it.
5. **Review** — words completed with clues stay in the review queue until the child spells them independently.

Each book also keeps the original listen, read, speak and write missions. Progress is saved only in this browser. Voice recordings stay in memory, are never uploaded or scored, and are deleted when the child leaves the activity.

## Audio

- `public/audio-standard/` — standard story narration.
- `public/audio/` — separately prepared child-slow story narration.
- `public/word-audio-standard/` — 160 standard word clips.
- `public/word-audio/` — 160 child-slow word clips with preserved pitch.

Both modes use prepared Aoede recordings; the browser does not time-stretch them during playback. All word clips have generation receipts; the earlier 90 clips also retain their independent blind-transcription records in `work/word-audio-production/transcript-verification.json`.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Then open [http://localhost:3001/](http://localhost:3001/) (or the port shown by the dev server).

## Verification commands

- `npm run build` — production build.
- `npm run lint` — source lint.
- `npm test` — build plus UI, progress, privacy, word-data and audio-receipt contracts.
- `npm run audio:check` — validate the receipt-backed original ten-book Aoede release without changing public files.
- `npm run audio:new-books` — securely resume the eight-book Aoede extension set.
- `npm run audio:new-books:batch` — resume only missing story and task clips through the quota-independent Batch API.
- Add `-- --id-prefix <job-prefix>` to a Batch command to limit generation to one safely named group, such as a new set of close-reading clips.
- `npm run words:audio` — securely resume missing word-audio generation and validation.
- `npm run words:audio:batch` — resume only missing word clips through the quota-independent Batch API.
- `npm run words:verify` — independently blind-transcribe the standard word clips.

The word-audio generator is receipt-backed and resumable. Credentials are read at runtime and are not written into the repository.
