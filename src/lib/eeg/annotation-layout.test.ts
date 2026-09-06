import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hitTestAnnotations, layoutAnnotation, layoutAnnotations } from "./annotation-layout.ts";
import type { Annotation } from "./types.ts";

const base = (patch: Partial<Annotation> = {}): Annotation => ({
  id: "a",
  start: 2,
  end: 3,
  trackId: "F3-C3",
  type: "spike",
  text: "",
  source: "auto",
  confidence: 0.7,
  ...patch,
});

const options = {
  viewStart: 1,
  viewDuration: 4,
  plotX: 100,
  plotWidth: 400,
  plotTop: 20,
  laneHeight: 30,
  laneIds: ["F3-C3", "C3-P3", "F4-C4"] as const,
  eventRailHeight: 18,
};

describe("annotation layout", () => {
  it("maps time to clipped pixels and the explicit channel lane", () => {
    const result = layoutAnnotation(base(), options, true)!;
    assert.equal(result.x0, 200);
    assert.equal(result.x1, 300);
    assert.deepEqual(result.lanes, [{ trackId: "F3-C3", top: 20, bottom: 50 }]);
    assert.equal(result.selected, true);
    assert.equal(result.global, false);
  });

  it("keeps instantaneous markers visible and clips partially visible spans", () => {
    const instant = layoutAnnotation(base({ start: 1, end: 1 }), options)!;
    assert.equal(instant.x0, 100);
    assert.equal(instant.x1, 102);
    const clipped = layoutAnnotation(base({ start: 0, end: 2 }), options)!;
    assert.equal(clipped.x0, 100);
    assert.equal(clipped.x1, 200);
    assert.equal(layoutAnnotation(base({ start: 6, end: 7 }), options), null);
  });

  it("maps multichannel and global annotations without inventing distribution", () => {
    const multi = layoutAnnotation(base({ trackId: null, trackIds: ["F3-C3", "F4-C4"] }), options)!;
    assert.deepEqual(multi.lanes, [
      { trackId: "F3-C3", top: 20, bottom: 50 },
      { trackId: "F4-C4", top: 80, bottom: 110 },
    ]);
    assert.equal(multi.global, false);
    const global = layoutAnnotation(base({ trackId: null }), options)!;
    assert.equal(global.global, true);
    assert.equal(global.lanes.length, 3);
  });

  it("preserves stable input order and selected identity", () => {
    const layouts = layoutAnnotations(
      [base({ id: "first" }), base({ id: "second", start: 3, end: 3.1 })],
      options,
      "second",
    );
    assert.deepEqual(
      layouts.map((item) => item.id),
      ["first", "second"],
    );
    assert.equal(layouts[1]!.selected, true);
  });
});

describe("annotation hit testing", () => {
  it("selects a marker in the event rail or its target lane", () => {
    const annotations = [
      base({ id: "f3", start: 2, end: 2.1, trackId: "F3-C3" }),
      base({ id: "f4", start: 2, end: 2.1, trackId: "F4-C4" }),
    ];
    assert.equal(hitTestAnnotations(annotations, 202, 25, options), "f3");
    assert.equal(hitTestAnnotations(annotations, 202, 95, options), "f4");
    assert.equal(hitTestAnnotations(annotations, 202, 10, options), "f3");
    assert.equal(hitTestAnnotations(annotations, 330, 25, options), null);
  });

  it("uses the narrowest span when events overlap", () => {
    const annotations = [
      base({ id: "wide", start: 1.5, end: 3.5 }),
      base({ id: "narrow", start: 2, end: 2.1 }),
    ];
    assert.equal(hitTestAnnotations(annotations, 205, 25, options), "narrow");
  });
});
