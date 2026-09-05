import type { ControlTrack, MixResult, MixerTrack, SonifySettings } from "./types.ts";
import { mixToStereo } from "./stereo.ts";
import { hasNan, peakAbs, percentileAbs } from "./preprocessing.ts";
import { SCALE_DEGREES } from "./musify.ts";
import { renderContour, settingsToOpts } from "./contour.ts";
import { mixSonify } from "./sonify.ts";
import { SCRUB_GRAIN_SECONDS, SCRUB_THROTTLE_MS, scrubPreviewTime } from "./scrub.ts";

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

function interpolateControl(samples: Float32Array, index: number): number {
  if (samples.length === 0) return 0;
  if (index <= 0) return samples[0]!;
  if (index >= samples.length - 1) return samples[samples.length - 1]!;
  const i = Math.floor(index);
  const f = index - i;
  return samples[i]! * (1 - f) + samples[i + 1]! * f;
}

function trackScale(samples: Float32Array): number {
  return 1 / Math.max(1e-6, percentileAbs(samples, 0.995));
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
type ScrubRequest = { eegTime: number; velocity: number };

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
  private soundEnabled = false;
  private sessionDirty = false;
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
  private scrubSource: AudioBufferSourceNode | null = null;
  private scrubGain: GainNode | null = null;
  private scrubPending: ScrubRequest | null = null;
  private scrubTimer: ReturnType<typeof setTimeout> | null = null;
  private scrubActive = false;
  private lastScrubMs = 0;

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this.ready) {
      this.ready = this.ctx.audioWorklet
        .addModule(`${import.meta.env.BASE_URL}contour-worklet.js?v=loui-2014`)
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
          this.ready = null;
          throw new Error("Audio could not start. Your browser must support AudioWorklet.", { cause: err });
        });
    }
    await this.ready;
    return this.ctx;
  }

  setControlTracks(tracks: ControlTrack[], eegDuration: number) {
    this.controls = tracks;
    this.eegDur = eegDuration;
    this.endedFired = false;
    this.sessionDirty = true;
    if (this.node) this.pushSession();
  }

  private pushSession() {
    if (!this.node || !this.sessionDirty) return;
    const tracks = this.controls.map((t) => ({
      ...t,
      scale:
        t.id === "evidence:loui-2014-events"
          ? 1 / 40
          : 1 / Math.max(1e-6, percentileAbs(t.voltage, 0.995)),
    }));
    this.node.port.postMessage({ type: "session", eegDuration: this.eegDur, tracks });
    this.sessionDirty = false;
    this.pushSettings();
  }

  setSoundEnabled(enabled: boolean) {
    // A mode change is a transport boundary. Off cannot start or resume audio.
    this.pause();
    this.endScrub();
    this.soundEnabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 1 : 0;
    if (!enabled && this.ctx) void this.ctx.suspend();
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
    const position = this.currentTime();
    this.sonify = sonify;
    this.negativeUp = negativeUp;
    this.timeScale = sonify.mode === "direct" ? sonify.compression : sonify.timeScale;
    this.eegOffset = position;
    this.startedAt = this.clock();
    this.pushSettings();
  }

  private clock(): number {
    return this.soundEnabled && this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  private pushSettings() {
    const s = this.sonify;
    if (!s || !this.node) return;
    if (this.lp) {
      this.lp.frequency.value =
        s.mode === "loui" || s.mode === "loui-hybrid"
          ? 4200
          : s.mode === "pen"
            ? 4200
          : s.mode === "piano"
            ? 2800
            : s.mode === "choir" || s.mode === "ambient"
              ? 2200
              : 2400;
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
      volume: s.volume ?? 0.88,
    });
  }

  /** EEG seconds. */
  currentTime(): number {
    if (!this.playing) {
      return Math.min(this.eegDur, Math.max(0, this.eegOffset));
    }
    let t = this.eegOffset + (this.clock() - this.startedAt) * this.timeScale;
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
    if (this.soundEnabled) {
      await this.ensure();
      this.pushSession();
      if (!this.node) throw new Error("Audio worklet is unavailable.");
    }
    this.endedFired = false;
    if (this.eegOffset >= this.eegDur - 1e-3) this.eegOffset = 0;
    if (this.soundEnabled) this.node?.port.postMessage({ type: "play", eegTime: this.eegOffset });
    this.startedAt = this.clock();
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.eegOffset = this.currentTime();
    this.node?.port.postMessage({ type: "pause" });
    this.playing = false;
  }

  stop() {
    this.endScrub();
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
    if (this.playing) {
      this.startedAt = this.clock();
      if (this.soundEnabled) this.node?.port.postMessage({ type: "play", eegTime: this.eegOffset });
    }
  }

  /** Play a short, rate-limited preview grain under the pointer during a scrub. */
  scrubAt(eegTime: number, velocity = 0) {
    if (!this.soundEnabled) return;
    this.scrubActive = true;
    this.scrubPending = { eegTime: Math.max(0, Math.min(this.eegDur, eegTime)), velocity };
    const now = typeof performance === "undefined" ? 0 : performance.now();
    const wait = Math.max(0, SCRUB_THROTTLE_MS - (now - this.lastScrubMs));
    if (wait > 0) {
      if (!this.scrubTimer) {
        this.scrubTimer = setTimeout(() => {
          this.scrubTimer = null;
          this.flushScrub();
        }, wait);
      }
      return;
    }
    this.flushScrub();
  }

  endScrub() {
    this.scrubActive = false;
    this.scrubPending = null;
    if (this.scrubTimer) clearTimeout(this.scrubTimer);
    this.scrubTimer = null;
    const ctx = this.ctx;
    const source = this.scrubSource;
    const gain = this.scrubGain;
    this.scrubSource = null;
    this.scrubGain = null;
    if (!ctx || !source || !gain) return;
    const at = ctx.currentTime;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setTargetAtTime(0, at, 0.006);
    try {
      source.stop(at + 0.035);
    } catch {
      /* already stopped */
    }
  }

  private flushScrub() {
    if (!this.scrubActive || !this.scrubPending) return;
    const request = this.scrubPending;
    this.scrubPending = null;
    this.lastScrubMs = typeof performance === "undefined" ? 0 : performance.now();
    void this.ensure().then((ctx) => {
      if (!this.scrubActive || !this.master) return;
      this.renderScrub(ctx, request);
    });
  }

  private renderScrub(ctx: AudioContext, request: ScrubRequest) {
    const active = this.controls.filter((track) => {
      if (track.mute || track.voltage.length === 0) return false;
      return !this.controls.some((other) => other.solo) || track.solo;
    });
    if (active.length === 0) return;

    const seconds = SCRUB_GRAIN_SECONDS;
    const n = Math.max(256, Math.round(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, n, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const settings = this.sonify;
    const scale = settings?.rangeSemitones ?? 8;
    const rootHz = 440 * 2 ** (((settings?.rootMidi ?? 50) - 69) / 12);
    const phases = active.slice(0, 6).map(() => 0);
    const scrubScales = active.slice(0, 6).map((track) => trackScale(track.voltage));
    for (let i = 0; i < n; i++) {
      const progress = i / Math.max(1, n - 1);
      const eegT = scrubPreviewTime(
        request.eegTime,
        request.velocity,
        progress,
        this.timeScale,
        this.eegDur,
      );
      const fade = Math.sin(Math.PI * progress);
      let l = 0;
      let r = 0;
      active.slice(0, 6).forEach((track, index) => {
        const raw = interpolateControl(track.voltage, eegT * track.sampleRate);
        const vn = Math.max(-1, Math.min(1, raw * (scrubScales[index] ?? 1)));
        const hz =
          settings?.mode === "direct"
            ? 120 + Math.abs(vn) * 680
            : rootHz * 2 ** ((vn * scale) / 12);
        phases[index] =
          (phases[index]! + (2 * Math.PI * Math.max(55, Math.min(1800, hz))) / ctx.sampleRate) %
          (2 * Math.PI);
        const energy = 0.035 + Math.min(0.16, Math.abs(vn) * 0.18);
        const sample =
          Math.sin(phases[index]!) * energy * (0.55 + 0.45 * Math.abs(vn)) * track.gain;
        const pan = Math.max(-1, Math.min(1, track.pan));
        l += sample * Math.cos(((pan + 1) * Math.PI) / 4);
        r += sample * Math.sin(((pan + 1) * Math.PI) / 4);
      });
      left[i] = l * fade;
      right[i] = r * fade;
    }

    this.endScrubSourceOnly();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.master!);
    const at = ctx.currentTime + 0.004;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.72, at + 0.012);
    gain.gain.setTargetAtTime(0, at + seconds * 0.72, 0.018);
    source.start(at);
    source.stop(at + seconds + 0.04);
    this.scrubSource = source;
    this.scrubGain = gain;
    source.onended = () => {
      if (this.scrubSource === source) {
        this.scrubSource = null;
        this.scrubGain = null;
      }
      gain.disconnect();
    };
  }

  private endScrubSourceOnly() {
    const source = this.scrubSource;
    const gain = this.scrubGain;
    this.scrubSource = null;
    this.scrubGain = null;
    if (!source || !gain || !this.ctx) return;
    const at = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setTargetAtTime(0, at, 0.004);
    try {
      source.stop(at + 0.028);
    } catch {
      /* already stopped */
    }
  }

  setLoop(loop: boolean) {
    this.loop = loop;
  }

  bounceWav(negativeUp: boolean): MixResult | null {
    if (!this.sonify || this.controls.length === 0) return null;
    if (
      this.sonify.mode !== "ambient" &&
      this.sonify.mode !== "choir" &&
      this.sonify.mode !== "piano"
    ) {
      return renderContour(this.controls, this.eegDur, settingsToOpts(this.sonify, negativeUp));
    }
    const anySolo = this.controls.some((track) => track.solo);
    return mixSonify(
      this.controls.map((track) => ({
        id: track.id,
        label: track.label,
        samples: track.voltage,
        sampleRate: track.sampleRate,
        laterality: track.laterality,
        kind: track.kind,
        gain: track.gain,
        audible: !track.mute && (!anySolo || track.solo),
      })),
      this.sonify,
      "per-track",
    );
  }

  /** @deprecated buffer API — kept so old mixdown tests still typecheck via mixdownTracks */
  setTracks(_tracks: MixerTrack[]) {
    /* contour engine ignores pre-bounced buffers */
  }
}

export const playback = new MixerEngine();
export { renderContour };
