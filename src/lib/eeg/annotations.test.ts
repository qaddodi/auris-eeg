import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AnnotationImportError,
  annotationHistoryRedo,
  annotationHistoryUndo,
  parseAnnotationsJson,
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
