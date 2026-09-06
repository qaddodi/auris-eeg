import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRecordingClock,
  parseEdfStartDateTime,
  recordingClockAt,
} from "./recording-clock.ts";

describe("EDF recording clock", () => {
  it("applies the EDF two-digit century rule", () => {
    assert.equal(recordingClockAt("01.02.24", "03.04.05", 0), "2024-02-01 03:04:05");
    assert.equal(recordingClockAt("31.12.85", "23.59.59", 1), "1986-01-01 00:00:00");
  });

  it("adds fractional elapsed seconds without timezone conversion", () => {
    assert.equal(recordingClockAt("29.02.24", "23.59.59", 1.234), "2024-03-01 00:00:00.234");
  });

  it("fails closed for malformed or impossible EDF fields", () => {
    assert.equal(parseEdfStartDateTime("31.02.24", "12.00.00"), null);
    assert.equal(parseEdfStartDateTime("2024-02-01", "12.00.00"), null);
    assert.equal(recordingClockAt("01.01.24", "12.00.00", -1), null);
    assert.equal(recordingClockAt("01.01.24", "12.00.00", Number.NaN), null);
  });

  it("formats valid Date values and rejects invalid Dates", () => {
    assert.equal(formatRecordingClock(new Date(Date.UTC(2026, 8, 6, 1, 2, 3))), "2026-09-06 01:02:03");
    assert.equal(formatRecordingClock(new Date(Number.NaN)), null);
  });
});
