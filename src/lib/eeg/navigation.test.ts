import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampNavigationPosition,
  clampNavigationViewport,
  createNavigationState,
  ensureVisible,
  followNavigationViewport,
  reduceNavigation,
  type NavigationState,
} from "./navigation.ts";

function state(options: Partial<Parameters<typeof createNavigationState>[0]> = {}): NavigationState {
  return createNavigationState({ recordingDurationSec: 100, ...options });
}

describe("navigation geometry", () => {
  it("clamps positions and viewports to the recording", () => {
    assert.equal(clampNavigationPosition(-1, 100), 0);
    assert.equal(clampNavigationPosition(101, 100), 100);
    assert.deepEqual(clampNavigationViewport(-5, 20, 100), {
      startSec: 0,
      durationSec: 20,
    });
    assert.deepEqual(clampNavigationViewport(95, 20, 100), {
      startSec: 80,
      durationSec: 20,
    });
  });

  it("keeps the follow anchor stable and clamps at recording edges", () => {
    assert.deepEqual(followNavigationViewport(50, 10, 100), {
      startSec: 47,
      durationSec: 10,
    });
    assert.deepEqual(followNavigationViewport(2, 10, 100), {
      startSec: 0,
      durationSec: 10,
    });
    assert.deepEqual(followNavigationViewport(99, 10, 100), {
      startSec: 90,
      durationSec: 10,
    });
  });

  it("does not move a viewport when an event is already fully visible", () => {
    assert.deepEqual(
      ensureVisible({ startSec: 40, durationSec: 10 }, 42, 44, 100),
      { startSec: 40, durationSec: 10 },
    );
  });

  it("places an out-of-view event near the review anchor", () => {
    assert.deepEqual(
      ensureVisible({ startSec: 40, durationSec: 10 }, 80, 82, 100),
      { startSec: 77, durationSec: 10 },
    );
  });

  it("starts a span longer than a page at the span start", () => {
    assert.deepEqual(
      ensureVisible({ startSec: 40, durationSec: 10 }, 60, 90, 100),
      { startSec: 60, durationSec: 10 },
    );
  });
});

describe("navigation state machine", () => {
  it("starts in follow mode and aligns its viewport to the position", () => {
    const initial = state({ positionSec: 50, viewport: { durationSec: 10 } });
    assert.equal(initial.followMode, "following");
    assert.equal(initial.positionSec, 50);
    assert.deepEqual(initial.viewport, { startSec: 47, durationSec: 10 });
  });

  it("keeps follow enabled through playback ticks and page crossings", () => {
    let current = state({ viewport: { durationSec: 10 } });
    current = reduceNavigation(current, { type: "play", positionSec: 8 });
    current = reduceNavigation(current, { type: "playback-tick", positionSec: 25 });
    assert.equal(current.followMode, "following");
    assert.equal(current.playbackStatus, "playing");
    assert.deepEqual(current.viewport, { startSec: 22, durationSec: 10 });
    current = reduceNavigation(current, { type: "playback-tick", positionSec: 35 });
    assert.equal(current.followMode, "following");
    assert.equal(current.viewport.startSec, 32);
  });

  it("keeps follow enabled when playback pauses and seeks while paused", () => {
    let current = state({ viewport: { durationSec: 10 } });
    current = reduceNavigation(current, { type: "play", positionSec: 20 });
    current = reduceNavigation(current, { type: "pause", positionSec: 26 });
    assert.equal(current.followMode, "following");
    assert.equal(current.playbackStatus, "paused");
    assert.deepEqual(current.viewport, { startSec: 23, durationSec: 10 });
    current = reduceNavigation(current, {
      type: "seek",
      positionSec: 72,
      intent: "programmatic",
    });
    assert.equal(current.followMode, "following");
    assert.deepEqual(current.viewport, { startSec: 69, durationSec: 10 });
  });

  it("only user seek disables follow", () => {
    const initial = state({ positionSec: 20, viewport: { durationSec: 10 } });
    const userSeek = reduceNavigation(initial, {
      type: "seek",
      positionSec: 80,
      intent: "user",
    });
    assert.equal(userSeek.followMode, "manual");
    assert.equal(userSeek.positionSec, 80);
    assert.deepEqual(userSeek.viewport, { startSec: 77, durationSec: 10 });

    const annotationSeek = reduceNavigation(initial, {
      type: "seek",
      positionSec: 80,
      intent: "annotation",
    });
    assert.equal(annotationSeek.followMode, "following");
    assert.deepEqual(annotationSeek.viewport, { startSec: 77, durationSec: 10 });
  });

  it("freezes the viewport when follow is explicitly disabled", () => {
    let current = state({ positionSec: 50, viewport: { durationSec: 10 } });
    current = reduceNavigation(current, { type: "set-follow", enabled: false });
    const frozen = current.viewport;
    current = reduceNavigation(current, { type: "playback-tick", positionSec: 90 });
    assert.equal(current.followMode, "manual");
    assert.deepEqual(current.viewport, frozen);
    assert.equal(current.positionSec, 90);
  });

  it("treats pan and page navigation as explicit manual overrides", () => {
    let current = state({ positionSec: 50, viewport: { durationSec: 10 } });
    current = reduceNavigation(current, { type: "pan", deltaSec: 10 });
    assert.equal(current.followMode, "manual");
    assert.equal(current.positionSec, 50);
    assert.equal(current.viewport.startSec, 57);
    current = reduceNavigation(current, { type: "page", direction: 1 });
    assert.equal(current.followMode, "manual");
    assert.equal(current.positionSec, 50);
    assert.equal(current.viewport.startSec, 67);
  });

  it("preserves follow for programmatic view changes and duration changes", () => {
    let current = state({ positionSec: 50, viewport: { durationSec: 10 } });
    current = reduceNavigation(current, {
      type: "set-view",
      startSec: 0,
      durationSec: 20,
    });
    assert.equal(current.followMode, "following");
    assert.deepEqual(current.viewport, { startSec: 44, durationSec: 20 });
    current = reduceNavigation(current, { type: "set-view-duration", durationSec: 5 });
    assert.equal(current.followMode, "following");
    assert.deepEqual(current.viewport, { startSec: 48.5, durationSec: 5 });
  });

  it("disables follow only for explicitly manual set-view transitions", () => {
    const current = reduceNavigation(state({ positionSec: 50 }), {
      type: "set-view",
      startSec: 10,
      durationSec: 20,
      intent: "manual",
    });
    assert.equal(current.followMode, "manual");
    assert.deepEqual(current.viewport, { startSec: 10, durationSec: 20 });
  });

  it("preserves follow through playback end and loop transitions", () => {
    const playing = reduceNavigation(state({ positionSec: 95, viewport: { durationSec: 10 } }), {
      type: "play",
    });
    const ended = reduceNavigation(playing, { type: "playback-end" });
    assert.equal(ended.followMode, "following");
    assert.equal(ended.positionSec, 100);
    assert.deepEqual(ended.viewport, { startSec: 90, durationSec: 10 });

    const looped = reduceNavigation(playing, { type: "playback-end", loop: true });
    assert.equal(looped.followMode, "following");
    assert.equal(looped.playbackStatus, "playing");
    assert.equal(looped.positionSec, 0);
    assert.deepEqual(looped.viewport, { startSec: 0, durationSec: 10 });
  });

  it("seeks and keeps an annotation visible without disabling follow", () => {
    let current = state({ positionSec: 10, viewport: { durationSec: 10 } });
    current = reduceNavigation(current, {
      type: "select-annotation",
      id: "ann-1",
      startSec: 80,
      endSec: 82,
    });
    assert.equal(current.selectedAnnotationId, "ann-1");
    assert.equal(current.positionSec, 80);
    assert.equal(current.followMode, "following");
    assert.deepEqual(current.viewport, { startSec: 77, durationSec: 10 });
  });

  it("ensures a selected annotation is visible in manual mode", () => {
    let current = state({
      followMode: "manual",
      viewport: { startSec: 40, durationSec: 10 },
      positionSec: 45,
    });
    current = reduceNavigation(current, {
      type: "select-annotation",
      id: "ann-2",
      startSec: 80,
      endSec: 82,
    });
    assert.equal(current.followMode, "manual");
    assert.equal(current.positionSec, 80);
    assert.deepEqual(current.viewport, { startSec: 77, durationSec: 10 });
  });

  it("keeps hover separate from the review position", () => {
    const initial = state({ positionSec: 20 });
    const hovered = reduceNavigation(initial, {
      type: "set-hover",
      hover: { timeSec: 90, trackId: "F3-C3" },
    });
    assert.deepEqual(hovered.hover, { timeSec: 90, trackId: "F3-C3" });
    assert.equal(hovered.positionSec, 20);
    assert.equal(hovered.followMode, "following");
  });

  it("clamps the position and viewport when recording duration changes", () => {
    const current = reduceNavigation(state({ positionSec: 90, viewport: { durationSec: 20 } }), {
      type: "recording-duration",
      durationSec: 50,
    });
    assert.equal(current.positionSec, 50);
    assert.deepEqual(current.viewport, { startSec: 30, durationSec: 20 });
  });

  it("keeps the integration cursor contract through display refreshes and annotation selection", () => {
    let current = state({ positionSec: 12, viewport: { durationSec: 10 } });
    current = reduceNavigation(current, {
      type: "set-view",
      startSec: 8,
      durationSec: 10,
      intent: "programmatic",
    });
    current = reduceNavigation(current, {
      type: "select-annotation",
      id: "ann-1",
      startSec: 88,
      endSec: 91,
    });
    current = reduceNavigation(current, {
      type: "set-view",
      startSec: 0,
      durationSec: 20,
      intent: "programmatic",
    });
    current = reduceNavigation(current, {
      type: "playback-tick",
      positionSec: 95,
    });
    assert.equal(current.followMode, "following");
    assert.equal(current.selectedAnnotationId, "ann-1");
    assert.equal(current.positionSec, 95);
    // Near the recording end, the viewport is clamped to its final legal
    // start rather than allowing the event cursor to leave the page.
    assert.deepEqual(current.viewport, { startSec: 80, durationSec: 20 });
  });
});
