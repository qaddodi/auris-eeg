/**
 * EDF stores the recording start as a two-digit date and a wall-clock time.
 * The format has no timezone, so this module deliberately returns a formatted
 * header clock value rather than pretending it is a UTC/local instant.
 *
 * EDF's century rule is: 85–99 => 1985–1999 and 00–84 => 2000–2084.
 * Invalid header fields or elapsed values fail closed with null.
 */

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function four(value: number): string {
  return String(value).padStart(4, "0");
}

/** Parse EDF fixed-width dd.mm.yy and hh.mm.ss fields. */
export function parseEdfStartDateTime(startDate: string, startTime: string): Date | null {
  const date = startDate.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  const time = startTime.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!date || !time) return null;

  const day = Number(date[1]);
  const month = Number(date[2]);
  const year = Number(date[3]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  const second = Number(time[3]);
  const fullYear = year >= 85 ? 1900 + year : 2000 + year;
  const value = new Date(Date.UTC(fullYear, month - 1, day, hour, minute, second));

  // Date.UTC normalizes overflows (e.g. 32 January), which is not acceptable
  // for a malformed EDF header. Compare every component after construction.
  if (
    value.getUTCFullYear() !== fullYear ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day ||
    value.getUTCHours() !== hour ||
    value.getUTCMinutes() !== minute ||
    value.getUTCSeconds() !== second
  ) {
    return null;
  }
  return value;
}

/** Format an EDF recording clock value without implying a timezone. */
export function formatRecordingClock(value: Date): string | null {
  if (!Number.isFinite(value.getTime())) return null;
  const milliseconds = value.getUTCMilliseconds();
  const base = `${four(value.getUTCFullYear())}-${two(value.getUTCMonth() + 1)}-${two(value.getUTCDate())} ${two(value.getUTCHours())}:${two(value.getUTCMinutes())}:${two(value.getUTCSeconds())}`;
  return milliseconds === 0 ? base : `${base}.${String(milliseconds).padStart(3, "0")}`;
}

/** Convert EDF header date/time plus elapsed EEG seconds to a display value. */
export function recordingClockAt(
  startDate: string,
  startTime: string,
  elapsedSeconds: number,
): string | null {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return null;
  const start = parseEdfStartDateTime(startDate, startTime);
  if (!start) return null;
  return formatRecordingClock(new Date(start.getTime() + elapsedSeconds * 1000));
}
