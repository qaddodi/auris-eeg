/**
 * Pure review-navigation state and transitions.
 *
 * Playback, rendering, annotations, and UI controls can all dispatch these
 * transitions without sharing mutable cursor/view state.  In particular,
 * background work must use the non-user transitions so it cannot silently
 * disable follow mode.
 */

export const MIN_NAVIGATION_VIEW_SEC = 0.5;
export const DEFAULT_NAVIGATION_VIEW_SEC = 10;
export const DEFAULT_FOLLOW_FRACTION = 0.3;

export type FollowMode = "following" | "manual";
export type PlaybackStatus = "stopped" | "playing" | "paused" | "ended";
export type SeekIntent = "user" | "annotation" | "programmatic";

export interface NavigationViewport {
  startSec: number;
  durationSec: number;
}

export interface NavigationHover {
  timeSec: number;
  trackId: string | null;
}

export interface NavigationState {
  recordingDurationSec: number;
  positionSec: number;
  viewport: NavigationViewport;
  followMode: FollowMode;
  playbackStatus: PlaybackStatus;
  hover: NavigationHover | null;
  selectedAnnotationId: string | null;
}

export type NavigationAction =
  | { type: "set-follow"; enabled: boolean }
  | { type: "play"; positionSec?: number }
  | { type: "pause"; positionSec: number }
  | { type: "stop"; positionSec?: number }
  | { type: "playback-tick"; positionSec: number }
  | { type: "playback-end"; loop?: boolean }
  | { type: "seek"; positionSec: number; intent: SeekIntent }
  | { type: "pan"; deltaSec: number }
  | {
      type: "set-view";
      startSec: number;
      durationSec: number;
      intent?: "manual" | "programmatic";
    }
  | { type: "set-view-duration"; durationSec: number }
  | { type: "zoom"; factor: number; anchorSec?: number }
  | { type: "page"; direction: -1 | 1 }
  | {
      type: "select-annotation";
      id: string | null;
      startSec?: number;
      endSec?: number;
    }
  | { type: "set-hover"; hover: NavigationHover | null }
  | { type: "recording-duration"; durationSec: number };

export interface CreateNavigationOptions {
  recordingDurationSec: number;
  positionSec?: number;
  viewport?: Partial<NavigationViewport>;
  followMode?: FollowMode;
  playbackStatus?: PlaybackStatus;
  selectedAnnotationId?: string | null;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDuration(durationSec: number): number {
  return Math.max(0, finiteOr(durationSec, 0));
}

function normalizeViewDuration(durationSec: number, recordingDurationSec: number): number {
  const total = normalizeDuration(recordingDurationSec);
  const minimum = Math.min(MIN_NAVIGATION_VIEW_SEC, total || MIN_NAVIGATION_VIEW_SEC);
  const maximum = Math.max(total, minimum);
  return clamp(finiteOr(durationSec, DEFAULT_NAVIGATION_VIEW_SEC), minimum, maximum);
}

export function clampNavigationViewport(
  startSec: number,
  durationSec: number,
  recordingDurationSec: number,
): NavigationViewport {
  const total = normalizeDuration(recordingDurationSec);
  const duration = normalizeViewDuration(durationSec, total);
  const maxStart = Math.max(0, total - duration);
  return {
    startSec: clamp(finiteOr(startSec, 0), 0, maxStart),
    durationSec: duration,
  };
}

export function clampNavigationPosition(positionSec: number, recordingDurationSec: number): number {
  return clamp(finiteOr(positionSec, 0), 0, normalizeDuration(recordingDurationSec));
}

export function followNavigationViewport(
  positionSec: number,
  durationSec: number,
  recordingDurationSec: number,
  fraction = DEFAULT_FOLLOW_FRACTION,
): NavigationViewport {
  const duration = normalizeViewDuration(durationSec, recordingDurationSec);
  const position = clampNavigationPosition(positionSec, recordingDurationSec);
  const anchor = clamp(finiteOr(fraction, DEFAULT_FOLLOW_FRACTION), 0, 1);
  return clampNavigationViewport(
    position - duration * anchor,
    duration,
    recordingDurationSec,
  );
}

/**
 * Return a viewport that contains an annotation span. Existing views are
 * preserved when they already contain the complete span, avoiding jumps while
 * browsing a selected event. Out-of-view event starts are placed near the
 * follow anchor (30% by default), while spans longer than the page start at
 * the event.
 */
export function ensureVisible(
  viewport: NavigationViewport,
  startSec: number,
  endSec: number,
  recordingDurationSec: number,
  anchorFraction = DEFAULT_FOLLOW_FRACTION,
): NavigationViewport {
  const total = normalizeDuration(recordingDurationSec);
  const current = clampNavigationViewport(viewport.startSec, viewport.durationSec, total);
  const start = clampNavigationPosition(startSec, total);
  const end = clampNavigationPosition(Math.max(start, endSec), total);
  const currentEnd = current.startSec + current.durationSec;
  if (start >= current.startSec && end <= currentEnd) return current;

  if (end - start >= current.durationSec) {
    return clampNavigationViewport(start, current.durationSec, total);
  }

  const anchor = clamp(finiteOr(anchorFraction, DEFAULT_FOLLOW_FRACTION), 0, 1);
  return clampNavigationViewport(
    start - current.durationSec * anchor,
    current.durationSec,
    total,
  );
}

/**
 * Shift a manual viewport along the recording timeline. Keeping this as a
 * pure geometry helper gives pointer, wheel, and keyboard panning identical
 * edge-clamping behavior.
 */
export function panNavigationViewport(
  viewport: NavigationViewport,
  deltaSec: number,
  recordingDurationSec: number,
): NavigationViewport {
  const current = clampNavigationViewport(
    viewport.startSec,
    viewport.durationSec,
    recordingDurationSec,
  );
  return clampNavigationViewport(
    current.startSec + finiteOr(deltaSec, 0),
    current.durationSec,
    recordingDurationSec,
  );
}

function viewportForPosition(state: NavigationState, positionSec: number): NavigationViewport {
  return followNavigationViewport(
    positionSec,
    state.viewport.durationSec,
    state.recordingDurationSec,
  );
}

function withPosition(state: NavigationState, positionSec: number): NavigationState {
  const position = clampNavigationPosition(positionSec, state.recordingDurationSec);
  return {
    ...state,
    positionSec: position,
    viewport:
      state.followMode === "following" ? viewportForPosition(state, position) : state.viewport,
  };
}

export function createNavigationState(options: CreateNavigationOptions): NavigationState {
  const total = normalizeDuration(options.recordingDurationSec);
  const duration = normalizeViewDuration(
    options.viewport?.durationSec ?? DEFAULT_NAVIGATION_VIEW_SEC,
    total,
  );
  const position = clampNavigationPosition(options.positionSec ?? 0, total);
  const followMode = options.followMode ?? "following";
  const initialViewport =
    followMode === "following"
      ? followNavigationViewport(position, duration, total)
      : clampNavigationViewport(options.viewport?.startSec ?? 0, duration, total);
  return {
    recordingDurationSec: total,
    positionSec: position,
    viewport: initialViewport,
    followMode,
    playbackStatus: options.playbackStatus ?? "stopped",
    hover: null,
    selectedAnnotationId: options.selectedAnnotationId ?? null,
  };
}

export function reduceNavigation(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  switch (action.type) {
    case "set-follow": {
      if (!action.enabled) {
        return { ...state, followMode: "manual" };
      }
      return {
        ...state,
        followMode: "following",
        viewport: viewportForPosition(state, state.positionSec),
      };
    }
    case "play": {
      const next = action.positionSec == null ? state.positionSec : action.positionSec;
      return { ...withPosition(state, next), playbackStatus: "playing" };
    }
    case "pause":
      return { ...withPosition(state, action.positionSec), playbackStatus: "paused" };
    case "stop": {
      const next = action.positionSec ?? 0;
      return { ...withPosition(state, next), playbackStatus: "stopped" };
    }
    case "playback-tick":
      return withPosition(state, action.positionSec);
    case "playback-end": {
      if (action.loop) {
        return {
          ...withPosition(state, 0),
          playbackStatus: "playing",
        };
      }
      return {
        ...withPosition(state, state.recordingDurationSec),
        playbackStatus: "ended",
      };
    }
    case "seek": {
      const position = clampNavigationPosition(action.positionSec, state.recordingDurationSec);
      const followMode = action.intent === "user" ? "manual" : state.followMode;
      const next = { ...state, positionSec: position, followMode };
      if (followMode === "following") {
        return { ...next, viewport: viewportForPosition(next, position) };
      }
      return action.intent === "user"
        ? {
            ...next,
            viewport: ensureVisible(
              state.viewport,
              position,
              position,
              state.recordingDurationSec,
            ),
          }
        : next;
    }
    case "pan": {
      return {
        ...state,
        followMode: "manual",
        viewport: panNavigationViewport(
          state.viewport,
          action.deltaSec,
          state.recordingDurationSec,
        ),
      };
    }
    case "set-view": {
      const viewport = clampNavigationViewport(
        action.startSec,
        action.durationSec,
        state.recordingDurationSec,
      );
      if (action.intent === "manual") {
        return { ...state, followMode: "manual", viewport };
      }
      return {
        ...state,
        viewport:
          state.followMode === "following"
            ? followNavigationViewport(
                state.positionSec,
                viewport.durationSec,
                state.recordingDurationSec,
              )
            : viewport,
      };
    }
    case "set-view-duration": {
      const duration = normalizeViewDuration(action.durationSec, state.recordingDurationSec);
      return {
        ...state,
        viewport:
          state.followMode === "following"
            ? followNavigationViewport(state.positionSec, duration, state.recordingDurationSec)
            : clampNavigationViewport(
                state.viewport.startSec,
                duration,
                state.recordingDurationSec,
              ),
      };
    }
    case "zoom": {
      const factor = Math.max(1e-3, finiteOr(action.factor, 1));
      const current = state.viewport;
      const duration = normalizeViewDuration(
        current.durationSec * factor,
        state.recordingDurationSec,
      );
      if (state.followMode === "following") {
        return {
          ...state,
          viewport: followNavigationViewport(
            state.positionSec,
            duration,
            state.recordingDurationSec,
          ),
        };
      }
      const anchor = action.anchorSec ?? state.positionSec;
      const rel = current.durationSec > 0 ? (anchor - current.startSec) / current.durationSec : 0.5;
      return {
        ...state,
        viewport: clampNavigationViewport(
          anchor - clamp(rel, 0, 1) * duration,
          duration,
          state.recordingDurationSec,
        ),
      };
    }
    case "page": {
      const delta = state.viewport.durationSec * action.direction;
      return {
        ...state,
        followMode: "manual",
        viewport: clampNavigationViewport(
          state.viewport.startSec + delta,
          state.viewport.durationSec,
          state.recordingDurationSec,
        ),
      };
    }
    case "select-annotation": {
      const next = { ...state, selectedAnnotationId: action.id };
      if (action.id == null || action.startSec == null) return next;
      const position = clampNavigationPosition(action.startSec, state.recordingDurationSec);
      const positioned = { ...next, positionSec: position };
      if (state.followMode === "following") {
        return { ...positioned, viewport: viewportForPosition(positioned, position) };
      }
      return {
        ...positioned,
        viewport: ensureVisible(
          state.viewport,
          action.startSec,
          action.endSec ?? action.startSec,
          state.recordingDurationSec,
        ),
      };
    }
    case "set-hover":
      return {
        ...state,
        hover: action.hover
          ? {
              timeSec: clampNavigationPosition(action.hover.timeSec, state.recordingDurationSec),
              trackId: action.hover.trackId,
            }
          : null,
      };
    case "recording-duration": {
      const total = normalizeDuration(action.durationSec);
      const position = clampNavigationPosition(state.positionSec, total);
      const duration = normalizeViewDuration(state.viewport.durationSec, total);
      return {
        ...state,
        recordingDurationSec: total,
        positionSec: position,
        viewport:
          state.followMode === "following"
            ? followNavigationViewport(position, duration, total)
            : clampNavigationViewport(state.viewport.startSec, duration, total),
      };
    }
  }
}
