import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AnnotationImportError,
  annotationToExport,
  annotationTrackIds,
  annotationHistoryRedo,
  annotationHistoryUndo,
  parseAnnotationsJson,
  snapAnnotationTime,
  validateAnnotations,
} from "./annotations.ts";
import type { Annotation } from "./types.ts";

const one: Annotation = {
  id: "one",
  start: 2,
  end: 3,
  trackId: "Fp1-F7",
  type: "spike",
  text: "brief",
  source: "user",
  confidence: 1,
};

describe("annotation imports", () => {
  it("snaps floating cursor times to the native hundredth-second step", () => {
    assert.equal(snapAnnotationTime(11.860299999982146), 11.86);
    assert.equal(snapAnnotationTime(11.865), 11.87);
    assert.equal(snapAnnotationTime(Number.NaN), 0);
  });

  it("accepts exported track spelling and produces deterministic file suggestions", () => {
    const input = JSON.stringify([
      { start: 2, end: 3, track: "Fp1-F7", type: "spike", text: "brief", source: "user" },
    ]);
    const first = parseAnnotationsJson(input, {
      duration: 10,
      trackIds: ["Fp1-F7"],
      source: "file",
    });
    const second = parseAnnotationsJson(input, {
      duration: 10,
      trackIds: ["Fp1-F7"],
      source: "file",
    });
    assert.deepEqual(first, second);
    assert.equal(first[0]!.source, "file");
  });

  it("rejects out-of-bounds times, unavailable channels, types, and excessive text", () => {
    assert.throws(
      () => validateAnnotations([{ ...one, end: 12 }], { duration: 10 }),
      AnnotationImportError,
    );
    assert.throws(
      () => validateAnnotations([{ ...one, trackId: "missing" }], { duration: 10, trackIds: [] }),
      AnnotationImportError,
    );
    assert.throws(
      () => validateAnnotations([{ ...one, type: "mystery" }], { duration: 10 }),
      AnnotationImportError,
    );
    assert.throws(
      () => validateAnnotations([{ ...one, text: "x".repeat(2001) }], { duration: 10 }),
      AnnotationImportError,
    );
    assert.throws(() => validateAnnotations([one, one], { duration: 10 }), AnnotationImportError);
  });

  it("accepts multichannel tracks and exports both modern and legacy spellings", () => {
    const input = parseAnnotationsJson(
      JSON.stringify([
        {
          start: 2,
          end: 3,
          tracks: ["Fp1-F7", "F7-T3"],
          type: "spike-wave",
          text: "regional pattern",
          source: "auto",
          confidence: 0.63,
        },
      ]),
      { duration: 10, trackIds: ["Fp1-F7", "F7-T3"] },
    )[0]!;
    assert.equal(input.trackId, null);
    assert.deepEqual(input.trackIds, ["Fp1-F7", "F7-T3"]);
    assert.deepEqual(annotationTrackIds(input), ["Fp1-F7", "F7-T3"]);
    assert.deepEqual(annotationToExport(input), {
      start: 2,
      end: 3,
      type: "spike-wave",
      text: "regional pattern",
      track: null,
      tracks: ["Fp1-F7", "F7-T3"],
      source: "auto",
      confidence: 0.63,
    });
  });

  it("rejects ambiguous scalar and multichannel targets", () => {
    assert.throws(
      () =>
        validateAnnotations([{ ...one, track: "Fp1-F7", tracks: ["Fp1-F7", "F7-T3"] }], {
          duration: 10,
          trackIds: ["Fp1-F7", "F7-T3"],
        }),
      AnnotationImportError,
    );
    assert.throws(
      () =>
        validateAnnotations([{ ...one, tracks: ["Fp1-F7", "Fp1-F7"] }], {
          duration: 10,
          trackIds: ["Fp1-F7"],
        }),
      AnnotationImportError,
    );
  });
});

describe("annotation history", () => {
  it("undoes and redoes snapshots without mutating either stack", () => {
    const two = [{ ...one, id: "two" }];
    const undone = annotationHistoryUndo([[one]], two, []);
    assert.deepEqual(undone.current, [one]);
    assert.deepEqual(undone.future, [two]);
    const redone = annotationHistoryRedo(undone.past, undone.current, undone.future);
    assert.deepEqual(redone.current, two);
    assert.deepEqual(redone.past, [[one]]);
  });
});
