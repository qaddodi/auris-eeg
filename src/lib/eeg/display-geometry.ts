/** Nominal CSS paper geometry used by the review display. */
export const CSS_PX_PER_MM = 96 / 25.4;
export const PAPER_SPEED_MM_PER_SEC = 30;

export function pixelsPerUv(sensitivityUvPerMm: number): number {
  return CSS_PX_PER_MM / Math.max(Number.EPSILON, sensitivityUvPerMm);
}

export function pixelsPerSecond(mmPerSec = PAPER_SPEED_MM_PER_SEC): number {
  return mmPerSec * CSS_PX_PER_MM;
}

export function nominalMmForVoltage(voltageUv: number, sensitivityUvPerMm: number): number {
  return Math.abs(voltageUv) / Math.max(Number.EPSILON, sensitivityUvPerMm);
}

export function waveformPlotWidth(durationSec: number, mmPerSec = PAPER_SPEED_MM_PER_SEC): number {
  return Math.max(0, durationSec) * pixelsPerSecond(mmPerSec);
}
