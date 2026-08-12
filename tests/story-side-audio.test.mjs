import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  BATCH_MAX_JOBS,
  MODEL,
  PROMPT_VERSION,
  TOOL_VERSION,
  VOICE,
  assertBatchJournalSetSafe,
  batchJournalAction,
  decodeBatchResponses,
  parseArguments,
  partitionStableBatchGroups,
  planJobs,
  prepareBatchJournal,
  requestFor,
} from "../scripts/generate-story-side-audio.mjs";

const run = promisify(execFile);

function sampleBooks() {
  return [{
    slug: "sample-book",
    title: "Sample Book",
    pages: [
      {
        transcript: "The cover.",
        audioSrc: "/audio/sample-book/01.mp3",
      },
      {
        transcript: "Left sentence. Right sentence.",
        audioSrc: "/audio/sample-book/02.mp3",
        sides: {
          left: {
            transcript: "Left sentence.",
            audioSrc: "/audio/sample-book/02-left.mp3",
          },
          right: "Right sentence.",
        },
      },
      {
        transcript: "Only the right page has words.",
        audioSrc: "/audio/sample-book/03.mp3",
        sides: {
          left: { transcript: "   ", audioSrc: null },
          right: {
            transcript: "Only the right page has words.",
            audioSrc: "/audio/sample-book/03-right.mp3",
          },
        },
      },
    ],
    tasks: {
      listen: { audioText: "This task must never become a side job." },
    },
  }];
}

function fakeBatchJob(index) {
  const page = String(index + 1).padStart(2, "0");
  const side = index % 2 ? "right" : "left";
  const displayText = `Side sentence ${index + 1}.`;
  const job = {
    id: `sample-book/${page}-${side}`,
    bookSlug: "sample-book",
    bookTitle: "Sample Book",
    pageNumber: index + 1,
    side,
    kind: "story",
    taskType: null,
    displayText,
    spokenText: displayText,
    ttsText: displayText,
    wordCount: 3,
    standardPath: `audio-standard/sample-book/${page}-${side}.mp3`,
    childPath: `audio/sample-book/${page}-${side}.mp3`,
    requestSha256: index.toString(16).padStart(64, "0"),
  };
  return job;
}

test("the CLI exposes only dry-run and the two safe Batch modes", () => {
  assert.deepEqual(parseArguments([]), { mode: "batch", dryRun: false });
  assert.deepEqual(parseArguments(["--batch"]), { mode: "batch", dryRun: false });
  assert.deepEqual(parseArguments(["--submit-batches", "--dry-run"]), {
    mode: "submit-batches",
    dryRun: true,
  });
  assert.throws(() => parseArguments(["--direct"]), /Unknown argument/);
});

test("the plan contains only explicitly declared left and right page audio", () => {
  const jobs = planJobs(sampleBooks());
  assert.deepEqual(jobs.map((job) => job.id), [
    "sample-book/02-left",
    "sample-book/02-right",
    "sample-book/03-right",
  ]);
  assert.equal(jobs.every((job) => job.kind === "story" && job.taskType === null), true);
  assert.equal(jobs.some((job) => /\/(?:listen|speak|read|write)$/.test(job.id)), false);
  assert.equal(jobs.some((job) => /\/\d{2}$/.test(job.id)), false);
  for (const job of jobs) {
    assert.equal(
      job.standardPath,
      `audio-standard/${job.bookSlug}/${String(job.pageNumber).padStart(2, "0")}-${job.side}.mp3`,
    );
    assert.equal(
      job.childPath,
      `audio/${job.bookSlug}/${String(job.pageNumber).padStart(2, "0")}-${job.side}.mp3`,
    );
    assert.match(job.requestSha256, /^[a-f0-9]{64}$/);
    assert.match(JSON.stringify(requestFor(job)), new RegExp(job.displayText.replace(/[.]/g, "\\.")));
  }
});

test("blank or absent side definitions never create placeholder jobs", () => {
  assert.deepEqual(planJobs([{
    slug: "quiet-book",
    title: "Quiet Book",
    pages: [
      { transcript: "Whole page only." },
      { transcript: "Blank sides.", sides: { left: "", right: { transcript: "  " } } },
    ],
  }]), []);
});

test("declared audio paths must follow the side-only output convention", () => {
  const books = sampleBooks();
  books[0].pages[1].sides.left.audioSrc = "/audio/sample-book/02.mp3";
  assert.throws(
    () => planJobs(books),
    /must use \/audio\/sample-book\/02-left\.mp3/,
  );
});

test("stable groups preserve complete-plan boundaries while skipping reusable and claimed jobs", () => {
  const jobs = Array.from({ length: BATCH_MAX_JOBS * 2 + 4 }, (_, index) => fakeBatchJob(index));
  const reusableIds = new Set([jobs[0].id, jobs[BATCH_MAX_JOBS].id]);
  const claimedSignatures = new Set([
    `${jobs[1].id}\u0000${jobs[1].requestSha256}`,
    `${jobs[BATCH_MAX_JOBS + 1].id}\u0000${jobs[BATCH_MAX_JOBS + 1].requestSha256}`,
  ]);
  const groups = partitionStableBatchGroups(jobs, reusableIds, claimedSignatures);
  assert.deepEqual(groups.map((group) => group.plannedJobs.length), [35, 35, 4]);
  assert.deepEqual(groups.map((group) => group.unfinishedJobs.length), [33, 33, 4]);
  assert.deepEqual(groups.map((group) => group.groupNumber), [1, 2, 3]);
  assert.ok(groups.every((group) => group.groupCount === 3));
});

test("journal phases are idempotent and uncertain submissions fail closed", () => {
  assert.equal(batchJournalAction({ phase: "prepared" }), "submit");
  for (const phase of ["submitted", "received", "received-partial", "applied"]) {
    assert.equal(batchJournalAction({ phase }), "skip-submission");
  }
  for (const phase of ["submitting", "submission-uncertain", "failed"]) {
    assert.throws(
      () => batchJournalAction({ phase }),
      /refusing automatic submission or resubmission/,
    );
  }
});

test("a prepared journal is persisted before submission and reused without network access", async () => {
  const journalRoot = await mkdtemp(join(tmpdir(), "story-side-journal-test-"));
  try {
    const jobs = [fakeBatchJob(1), fakeBatchJob(2)];
    const first = await prepareBatchJournal(jobs, journalRoot);
    const second = await prepareBatchJournal(jobs, journalRoot);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(first.path, second.path);
    assert.equal(second.journal.phase, "prepared");
    assert.equal(second.journal.name, null);
    assert.equal(second.journal.toolVersion, TOOL_VERSION);
    assert.equal(second.journal.promptVersion, PROMPT_VERSION);
    assert.ok(second.journal.body);
    assert.deepEqual(
      second.journal.jobs,
      jobs.map(({ id, requestSha256 }) => ({ id, requestSha256 })),
    );
    const persisted = JSON.parse(await readFile(first.path, "utf8"));
    assert.equal(persisted.phase, "prepared");
    assert.ok(persisted.bodySha256);
  } finally {
    await rm(journalRoot, { recursive: true, force: true });
  }
});

test("duplicate submitted Batch names and uncertain journals stop the whole pass", () => {
  const entry = (phase, name, id) => ({
    path: resolve(`/tmp/${id}.json`),
    journal: {
      schemaVersion: 1,
      toolVersion: TOOL_VERSION,
      model: MODEL,
      voice: VOICE,
      promptVersion: PROMPT_VERSION,
      phase,
      name,
      jobs: [{ id: `sample-book/01-${id}`, requestSha256: "a".repeat(64) }],
    },
  });
  assert.throws(
    () => assertBatchJournalSetSafe([
      entry("submitted", "batches/shared", "left"),
      entry("received", "batches/shared", "right"),
    ]),
    /claimed by more than one journal/,
  );
  assert.throws(
    () => assertBatchJournalSetSafe([
      entry("submission-uncertain", null, "left"),
    ]),
    /refusing automatic submission or resubmission/,
  );
});

test("one unusable Batch response does not discard its valid sibling", () => {
  const jobs = [fakeBatchJob(1), fakeBatchJob(2)];
  const pcm = Buffer.alloc(2_048).toString("base64");
  const responses = [
    {
      response: {
        candidates: [{
          finishReason: "STOP",
          content: {
            parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm } }],
          },
        }],
      },
    },
    { response: { candidates: [{ finishReason: "OTHER", content: { parts: [] } }] } },
  ];
  const result = decodeBatchResponses(responses, jobs);
  assert.equal(result.decoded[0].pcm.length, 2_048);
  assert.equal(result.decoded[1], null);
  assert.deepEqual(result.failures.map((failure) => failure.id), [jobs[1].id]);
});

test("dry-run succeeds without credentials and returns before all network or audio work", async () => {
  const script = resolve("scripts/generate-story-side-audio.mjs");
  const { stdout } = await run(process.execPath, [script, "--dry-run"], {
    cwd: resolve("."),
    env: {
      ...process.env,
      GEMINI_API_KEY: "",
      GEMINI_KEY_PROJECT: "",
      GEMINI_KEY_NAME: "",
    },
    timeout: 30_000,
  });
  assert.match(stdout, /^Plan: \d+ left\/right clip\(s\)/);
});

test("the side generator has no synchronous Gemini route and reuses the established child transform", async () => {
  const source = await readFile(
    new URL("../scripts/generate-story-side-audio.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /models\/\$\{MODEL\}:generateContent/);
  assert.match(source, /models\/\$\{MODEL\}:batchGenerateContent/);
  assert.match(source, /await makeStandard\(pcmPath, standardPath\)/);
  assert.match(source, /await makeChild\(job, standardPath, childPath\)/);
  assert.match(source, /if \(options\.dryRun \|\| !jobs\.length\) return;/);
  assert.match(
    source,
    /if \(options\.mode !== "submit-batches"\) await saveManifest\(manifest, jobs, records\);/,
  );
  assert.match(
    source,
    /if \(options\.mode === "submit-batches"\)[\s\S]{0,160}await submitAllPreparedBatchGroups\(key, jobs, records\);\s+return;/,
  );
  const recoverIndex = source.indexOf(
    "await recoverClaimedBatchJournals(key, jobs, records, manifest);",
  );
  const newBatchIndex = source.indexOf(
    "recoverCompletedBatch(key, batchJobs) ?? await runBatch(key, batchJobs)",
  );
  assert.ok(
    recoverIndex >= 0 && newBatchIndex > recoverIndex,
    "Batch mode must recover every safely claimed journal before it can submit a new group",
  );
});
