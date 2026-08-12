import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  BATCH_MAX_JOBS,
  MODEL,
  VOICE,
  assertBatchJournalSetSafe,
  batchJournalAction,
  decodeBatchResponses,
  equivalentChunkJob,
  parseArguments,
  partitionStableBatchGroups,
  prepareBatchJournal,
} from "../scripts/generate-dinosaur-pronunciation-audio.mjs";

function fakeJob(index) {
  return {
    id: `dinosaur${index}/whole`,
    kind: "whole",
    name: `Dinosaur ${index}`,
    pronunciationGuide: "DYE-nuh-sor",
    requestSha256: String(index).padStart(64, "0"),
  };
}

test("--submit-batches selects the submit-only mode", () => {
  assert.deepEqual(parseArguments(["--submit-batches"]), {
    mode: "submit-batches",
    dryRun: false,
  });
  assert.deepEqual(parseArguments(["--submit-batches", "--dry-run"]), {
    mode: "submit-batches",
    dryRun: true,
  });
});

test("submit-only grouping preserves complete-plan boundaries", () => {
  const jobs = Array.from({ length: BATCH_MAX_JOBS * 2 + 7 }, (_, index) => fakeJob(index));
  const reusableIds = new Set([jobs[0].id, jobs[BATCH_MAX_JOBS].id]);
  const claimedSignatures = new Set([
    `${jobs[1].id}\u0000${jobs[1].requestSha256}`,
    `${jobs[BATCH_MAX_JOBS + 1].id}\u0000${jobs[BATCH_MAX_JOBS + 1].requestSha256}`,
  ]);
  const groups = partitionStableBatchGroups(jobs, reusableIds, claimedSignatures);

  assert.deepEqual(groups.map((group) => group.plannedJobs.length), [35, 35, 7]);
  assert.deepEqual(groups.map((group) => group.unfinishedJobs.length), [33, 33, 7]);
  assert.deepEqual(groups.map((group) => group.groupNumber), [1, 2, 3]);
  assert.ok(groups.every((group) => group.groupCount === 3));
});

test("journal phases are idempotent and fail closed", () => {
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

test("one unusable Batch item does not discard valid sibling audio", () => {
  const jobs = [fakeJob(1), fakeJob(2)];
  const pcm = Buffer.alloc(2_048).toString("base64");
  const responses = [
    {
      response: {
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm } }] },
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

test("an identical sound chunk in the same dinosaur can be reused safely", () => {
  const target = { ...fakeJob(1), id: "apatosaurus/chunk-a", kind: "chunk-a", name: "Apatosaurus", spokenText: "uh" };
  const match = { ...fakeJob(2), id: "apatosaurus/chunk-o", kind: "chunk-o", name: "Apatosaurus", spokenText: " UH " };
  const otherDinosaur = { ...fakeJob(3), id: "other/chunk-o", kind: "chunk-o", name: "Other", spokenText: "uh" };
  const records = new Map([[match.id, { id: match.id }], [otherDinosaur.id, { id: otherDinosaur.id }]]);

  assert.equal(equivalentChunkJob(target, [target, otherDinosaur, match], records), match);
  assert.equal(equivalentChunkJob(target, [target, otherDinosaur], records), null);
});

test("prepared journals are created once and reused without network access", async () => {
  const workRoot = await mkdtemp(join(tmpdir(), "dinosaur-submit-test-"));
  try {
    const jobs = [fakeJob(1), fakeJob(2)];
    const first = await prepareBatchJournal(jobs, workRoot);
    const second = await prepareBatchJournal(jobs, workRoot);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(first.path, second.path);
    assert.equal(second.journal.phase, "prepared");
    assert.equal(second.journal.name, null);
    assert.deepEqual(second.journal.jobs, jobs.map(({ id, requestSha256 }) => ({ id, requestSha256 })));
    const persisted = JSON.parse(await readFile(first.path, "utf8"));
    assert.equal(persisted.phase, "prepared");
    assert.ok(persisted.body);
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("submitted names are unique and unsafe journals stop the whole submit pass", () => {
  const journal = (phase, name, id) => ({
    path: resolve(`/tmp/${id}.json`),
    journal: {
      schemaVersion: 1,
      model: MODEL,
      voice: VOICE,
      phase,
      name,
      jobs: [{ id: `${id}/whole`, requestSha256: "a".repeat(64) }],
    },
  });
  assert.throws(
    () => assertBatchJournalSetSafe([
      journal("submitted", "batches/shared", "one"),
      journal("received", "batches/shared", "two"),
    ]),
    /claimed by more than one journal/,
  );
  assert.throws(
    () => assertBatchJournalSetSafe([
      journal("submission-uncertain", null, "uncertain"),
    ]),
    /refusing automatic submission or resubmission/,
  );
});

test("submit-only exits before polling and never writes the manifest", async () => {
  const source = await readFile(
    new URL("../scripts/generate-dinosaur-pronunciation-audio.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /if \(options\.mode !== "submit-batches"\) await saveManifest\(manifest, jobs, records\);/,
  );
  const submitOnlyBranch = source.indexOf('if (options.mode === "submit-batches")');
  const directBranch = source.indexOf('if (options.mode !== "batch")', submitOnlyBranch);
  assert.ok(submitOnlyBranch >= 0 && directBranch > submitOnlyBranch);
  assert.match(
    source.slice(submitOnlyBranch, directBranch),
    /await submitAllPreparedBatchGroups\(key, jobs, records\);\s+return;/,
  );
});
