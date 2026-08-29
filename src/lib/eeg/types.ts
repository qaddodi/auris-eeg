export type Laterality = "left" | "right" | "midline" | "unknown";

export type ChannelKind = "eeg" | "ekg" | "eog" | "emg" | "extra" | "dc" | "other";

export type MontageKind = "original" | "double-banana" | "transverse" | "custom";

export type SonifyMode = "contour" | "ambient" | "choir" | "pulse" | "direct" | "piano" | "pen";

export type ScaleName = "pentatonic" | "dorian" | "harmonic" | "major";

export type CombineMode = "per-track" | "average" | "stereo";

export type MorphologyType =
  | "spike"
  | "sharp"
  | "slow"
  | "spike-wave"
  | "polyspike"
  | "periodic"
  | "burst-suppression"
  | "spindle"
  | "alpha"
  | "triphasic"
  | "blink"
  | "qrs"
  | "muscle"
  | "comment";

export type AnnotationSource = "user" | "auto" | "file";

export interface EdfSignal {
  index: number;
  label: string;
  transducer: string;
  unit: string;
  physicalMin: number;
  physicalMax: number;
  digitalMin: number;
  digitalMax: number;
  prefilter: string;
  samplesPerRecord: number;
  reserved: string;
  sampleRate: number;
  isAnnotation: boolean;
}

export interface EdfAnnotation {
  onset: number;
  duration: number | null;
  text: string;
}

export interface EdfHeader {
  version: string;
  identifierWarning: boolean;
  startDate: string;
  startTime: string;
  headerBytes: number;
  reserved: string;
  recordCount: number;
  recordDuration: number;
  duration: number;
  signals: EdfSignal[];
  bytesPerRecord: number;
  isEdfPlus: boolean;
}

export interface LoadedRecording {
  name: string;
  header: EdfHeader;
  buffer: ArrayBuffer;
  annotations: EdfAnnotation[];
}

export interface ChannelInfo {
  originalLabel: string;
  index: number;
  canonical: string;
  laterality: Laterality;
  kind: ChannelKind;
  isEeg: boolean;
  unit: string;
  sampleRate: number;
}

export interface Derivation {
  id: string;
  label: string;
  sources: [number] | [number, number];
  laterality: Laterality;
  kind: ChannelKind;
  sampleRate: number;
  available: boolean;
  missing: string[];
}

export interface TrackState {
  id: string;
  mute: boolean;
  solo: boolean;
  gain: number;
  lateralityOverride: Laterality | null;
}

export interface MixerTrack {
  id: string;
  samples: Float32Array;
  sampleRate: number;
  pan: number;
  gain: number;
  mute: boolean;
  solo: boolean;
}

export interface FilterSettings {
  bandpass: boolean;
  bandpassLow: number;
  bandpassHigh: number;
  lff: number;
  hff: number;
  notch60: boolean;
  removeDc: boolean;
}

export interface SonifySettings {
  mode: SonifyMode;
  compression: number;
  carrierHz: number;
  depth: number;
  amTimeScale: number;
  timeScale: number;
  outputRate: number;
  hybridMix: number;
  brightness: number;
  percentile: number;
  scale: ScaleName;
  rootMidi: number;
  rangeSemitones: number;
  quantize: boolean;
  /** Internal safety/master gain. Deliberately not exposed as a global slider. */
  volume: number;
}

export interface Annotation {
  id: string;
  start: number;
  end: number;
  trackId: string | null;
  type: MorphologyType;
  text: string;
  source: AnnotationSource;
  confidence: number;
}

export interface SegmentRequest {
  start: number;
  duration: number;
}

export interface ProcessedTrack {
  id: string;
  label: string;
  laterality: Laterality;
  kind: ChannelKind;
  samples: Float32Array;
  sampleRate: number;
}

export interface MixResult {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  duration: number;
  eegDuration: number;
  compressionUsed: number;
  peak: number;
  clipped: boolean;
}

export interface ReproSummary {
  file: string;
  montage: string;
  channels: string[];
  interval: string;
  filters: string[];
  normalization: string;
  method: string;
  compression: string;
  carrier: string;
  outputRate: string;
  stereo: string;
  audible: string[];
}

export interface ControlTrack {
  id: string;
  label: string;
  kind: ChannelKind;
  laterality: Laterality;
  voltage: Float32Array;
  sampleRate: number;
  pan: number;
  gain: number;
  mute: boolean;
  solo: boolean;
  spikes: Float32Array;
}
