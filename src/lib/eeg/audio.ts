import type { ControlTrack, MixResult, MixerTrack, SonifySettings } from "./types.ts";
import { mixToStereo } from "./stereo.ts";
import { hasNan, peakAbs, percentileAbs } from "./preprocessing.ts";
import { SCALE_DEGREES } from "./musify.ts";
import { renderContour, settingsToOpts } from "./contour.ts";

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

export function encodeWav(mix: MixResult, bitDepth: 16 | 24 = 16): Blob {
  const n = mix.left.length;
  const ch = 2;
  const bytesPerSample = bitDepth / 8;
  const dataSize = n * ch * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, mix.sampleRate, true);
  view.setUint32(28, mix.sampleRate * ch * bytesPerSample, true);
  view.setUint16(32, ch * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let o = 44;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, mix.left[i] ?? 0));
    const r = Math.max(-1, Math.min(1, mix.right[i] ?? 0));
    if (bitDepth === 16) {
      view.setInt16(o, Math.round(l * 32767), true);
      view.setInt16(o + 2, Math.round(r * 32767), true);
      o += 4;
    } else {
      const sl = Math.round(l * 8388607);
      const sr = Math.round(r * 8388607);
      view.setUint8(o, sl & 0xff);
      view.setUint8(o + 1, (sl >> 8) & 0xff);
      view.setUint8(o + 2, (sl >> 16) & 0xff);
      view.setUint8(o + 3, sr & 0xff);
      view.setUint8(o + 4, (sr >> 8) & 0xff);
      view.setUint8(o + 5, (sr >> 16) & 0xff);
      o += 6;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function mixdownTracks(
  tracks: MixerTrack[],
  eegDuration: number,
  compressionUsed: number,
): MixResult {
  const sampleRate = tracks[0]?.sampleRate ?? 44100;
  const len = tracks.reduce((m, t) => Math.max(m, t.samples.length), 0);
  const duration = len / Math.max(1, sampleRate);
  const empty: MixResult = {
    left: new Float32Array(len),
    right: new Float32Array(len),
    sampleRate,
    duration,
    eegDuration,
    compressionUsed,
    peak: 0,
    clipped: false,
  };
  if (len === 0 || tracks.length === 0)
    return { ...empty, left: new Float32Array(0), right: new Float32Array(0), duration: 0 };

  const anySolo = tracks.some((t) => t.solo);
  const active = tracks.filter((t) => {
    if (t.mute) return false;
    if (anySolo && !t.solo) return false;
    return t.samples.length > 0;
  });
  if (active.length === 0) return empty;

  const mixed = mixToStereo(
    active.map((t) => ({ samples: t.samples, pan: t.pan, gain: t.gain })),
    len,
  );
  const peak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right), 1e-9);
  const target = 0.89;
  if (peak > target) {
    const g = target / peak;
    for (let i = 0; i < mixed.left.length; i++) {
      mixed.left[i]! *= g;
      mixed.right[i]! *= g;
    }
  }
  const finalPeak = Math.max(peakAbs(mixed.left), peakAbs(mixed.right));
  return {
    left: mixed.left,
    right: mixed.right,
    sampleRate,
    duration,
    eegDuration,
    compressionUsed,
    peak: finalPeak,
    clipped: finalPeak > 0.999 || hasNan(mixed.left) || hasNan(mixed.right),
  };
}

type Param = { id: string; pan: number; gain: number; mute: boolean; solo: boolean };

/**
 * Realtime contour player. Mute/solo/gain/pan are messages to the worklet —
 * nothing is resynthesized.
 */
export class MixerEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  lp: BiquadFilterNode | null = null;
  node: AudioWorkletNode | null = null;
  playing = false;
  loop = false;
  private eegDur = 0;
  private timeScale = 2;
  private eegOffset = 0;
  private startedAt = 0;
  private ready: Promise<void> | null = null;
  onEnded: (() => void) | null = null;
  private endedFired = false;
  private controls: ControlTrack[] = [];
  private sonify: SonifySettings | null = null;
  private negativeUp = true;

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.ready) {
      this.ready = this.ctx.audioWorklet
        .addModule("/contour-worklet.js?v=pen-dsa")
        .then(() => {
          if (!this.ctx) return;
          this.node = new AudioWorkletNode(this.ctx, "contour-synth", {
            outputChannelCount: [2],
          });
          this.node.port.onmessage = (ev) => {
            if (ev.data?.type === "ended") {
              if (this.loop) {
                this.seek(0);
                void this.play();
                return;
              }
              if (!this.endedFired) {
                this.endedFired = true;
                this.playing = false;
                this.eegOffset = this.eegDur;
                this.onEnded?.();
              }
            }
          };
          this.lp = this.ctx.createBiquadFilter();
          this.lp.type = "lowpass";
          this.lp.frequency.value = 2600;
          this.lp.Q.value = 0.65;
          this.master = this.ctx.createGain();
          this.master.gain.value = 1.15;
          this.node.connect(this.lp);
          this.lp.connect(this.master);
          this.master.connect(this.ctx.destination);
        })
        .catch((err) => {
          console.warn("contour worklet failed", err);
        });
    }
    await this.ready;
    return this.ctx;
  }

  setControlTracks(tracks: ControlTrack[], eegDuration: number) {
    this.controls = tracks;
    this.eegDur = eegDuration;
    this.endedFired = false;
    const payload = tracks.map((t) => ({
      id: t.id,
      voltage: t.voltage,
      sampleRate: t.sampleRate,
      pan: t.pan,
      gain: t.gain,
      mute: t.mute,
      solo: t.solo,
      spikes: t.spikes,
      scale: 1 / Math.max(1e-6, percentileAbs(t.voltage, 0.995)),
      kind: t.kind,
    }));
    void this.ensure().then(() => {
      this.node?.port.postMessage({ type: "session", eegDuration, tracks: payload });
      this.pushSettings();
    });
  }

  applyParams(params: Param[]) {
    for (const p of params) {
      const c = this.controls.find((t) => t.id === p.id);
      if (c) {
        c.pan = p.pan;
        c.gain = p.gain;
        c.mute = p.mute;
        c.solo = p.solo;
      }
    }
    this.node?.port.postMessage({
      type: "params",
      tracks: params,
    });
  }

  setSettings(sonify: SonifySettings, negativeUp: boolean) {
    this.sonify = sonify;
    this.negativeUp = negativeUp;
    this.timeScale = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
    this.pushSettings();
  }

  private pushSettings() {
    const s = this.sonify;
    if (!s || !this.node) return;
    if (this.lp) {
      this.lp.frequency.value = s.mode === "pen" ? 4200 : s.mode === "piano" ? 2800 : s.mode === "choir" ? 2200 : 2400;
    }
    this.node.port.postMessage({
      type: "settings",
      timeScale: this.timeScale,
      rootMidi: s.rootMidi,
      rangeSemitones: s.rangeSemitones,
      negativeUp: this.negativeUp,
      quantize: s.quantize,
      degrees: SCALE_DEGREES[s.scale],
      mode: s.mode,
      volume: s.volume ?? 1.45,
    });
  }

  /** EEG seconds. */
  currentTime(): number {
    if (!this.playing || !this.ctx) {
      return Math.min(this.eegDur, Math.max(0, this.eegOffset));
    }
    let t = this.eegOffset + (this.ctx.currentTime - this.startedAt) * this.timeScale;
    if (this.loop && this.eegDur > 0) t = ((t % this.eegDur) + this.eegDur) % this.eegDur;
    else t = Math.min(this.eegDur, Math.max(0, t));
    if (!this.loop && this.eegDur > 0 && t >= this.eegDur - 1e-3) {
      if (!this.endedFired) {
        this.endedFired = true;
        this.playing = false;
        this.eegOffset = this.eegDur;
        this.node?.port.postMessage({ type: "pause" });
        this.onEnded?.();
      }
      return this.eegDur;
    }
    return t;
  }

  duration(): number {
    return this.eegDur;
  }

  audioDuration(): number {
    return this.eegDur / Math.max(0.25, this.timeScale);
  }

  async play() {
    if (this.eegDur <= 0) return;
    const ctx = await this.ensure();
    if (!this.node) return;
    this.endedFired = false;
    if (this.eegOffset >= this.eegDur - 1e-3) this.eegOffset = 0;
    this.node.port.postMessage({ type: "play", eegTime: this.eegOffset });
    this.startedAt = ctx.currentTime;
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.eegOffset = this.currentTime();
    this.node?.port.postMessage({ type: "pause" });
    this.playing = false;
  }

  stop() {
    this.node?.port.postMessage({ type: "pause" });
    this.node?.port.postMessage({ type: "seek", eegTime: 0 });
    this.playing = false;
    this.eegOffset = 0;
    this.endedFired = false;
  }

  seek(eegT: number) {
    this.eegOffset = Math.min(this.eegDur, Math.max(0, eegT));
    this.endedFired = false;
    this.node?.port.postMessage({ type: "seek", eegTime: this.eegOffset });
    if (this.playing && this.ctx) {
      this.startedAt = this.ctx.currentTime;
      this.node?.port.postMessage({ type: "play", eegTime: this.eegOffset });
    }
  }

  setLoop(loop: boolean) {
    this.loop = loop;
  }

  bounceWav(negativeUp: boolean): MixResult | null {
    if (!this.sonify || this.controls.length === 0) return null;
    return renderContour(this.controls, this.eegDur, settingsToOpts(this.sonify, negativeUp));
  }

  /** @deprecated buffer API — kept so old mixdown tests still typecheck via mixdownTracks */
  setTracks(_tracks: MixerTrack[]) {
    /* contour engine ignores pre-bounced buffers */
  }
}

export const playback = new MixerEngine();
export { renderContour };
