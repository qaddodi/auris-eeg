/* Warm EEG listener.
   Contour: graph-up → pitch up. Pulse: count the rhythm.
   Choir: just-intonation 1/f (1 : 5/4 : 3/2 : 2) for delta/theta/alpha/beta.
   Piano (experimental): in-scale piano while the field looks ordinary; spikes clang a
   tritone, slowing goes flat, muscle adds grit.
   Pen: analog paper scratch — |dV/dt| is the pen speed (Norata 2023).
   Mute/solo are live gains. */
class ContourProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.tracks = [];
    this.playing = false;
    this.eegT = 0;
    this.timeScale = 2;
    this.root = 50;
    this.range = 8;
    this.negativeUp = 1;
    this.degrees = [0, 3, 5, 7, 10];
    this.quantize = 0;
    this.mode = "contour";
    this.volume = 1.45;
    this.audioStart = 0;
    this.eegStart = 0;
    this.eegDuration = 0;
    this.lpL = 0;
    this.lpR = 0;
    this.prevL = 0;
    this.prevR = 0;
    this.dcL = 0;
    this.dcR = 0;
    this.comp = 0.18;
    this.g = [this.freshVoice(), this.freshVoice(), this.freshVoice()];
    this.choirPhase = [0, 0, 0, 0];
    this.choirEnv = [0, 0, 0, 0];
    this.bandLp = [0, 0, 0, 0];
    this.ekgPhase = 0;
    this.eogPhase = 0;
    this.eogNoise = 0;
    this.noise = 0;
    this.port.onmessage = (ev) => this.onmsg(ev.data);
  }

  freshVoice() {
    return {
      phase: 0,
      amp: 0.25,
      hz: 130,
      live: 0,
      slow: 0,
      fast: 0,
      hammer: 0,
      lastMidi: 50,
      grit: 0,
      prevVn: 0,
    };
  }

  midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  quantizeMidi(midi) {
    const deg = this.degrees;
    if (!deg || !deg.length) return midi;
    const rel = midi - this.root;
    const oct = Math.floor(rel / 12);
    const pc = rel - oct * 12;
    let best = deg[0];
    let bestD = 99;
    for (let i = 0; i < deg.length; i++) {
      const d = deg[i];
      const err = Math.abs(d - pc);
      const wrap = Math.abs(d + 12 - pc);
      if (err < bestD) {
        bestD = err;
        best = d;
      }
      if (wrap < bestD) {
        bestD = wrap;
        best = d;
      }
    }
    return this.root + oct * 12 + best;
  }

  interp(x, idx) {
    if (!x || x.length === 0) return 0;
    if (idx <= 0) return x[0];
    if (idx >= x.length - 1) return x[x.length - 1];
    const i = idx | 0;
    const f = idx - i;
    return x[i] * (1 - f) + x[i + 1] * f;
  }

  onmsg(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === "session") {
      this.eegDuration = msg.eegDuration || 0;
      this.tracks = (msg.tracks || []).map((t) => ({
        id: t.id,
        voltage: t.voltage,
        rate: t.sampleRate || 200,
        pan: t.pan || 0,
        gain: t.gain == null ? 1 : t.gain,
        mute: !!t.mute,
        solo: !!t.solo,
        spikes: t.spikes || new Float32Array(0),
        scale: t.scale || 1,
        kind: t.kind || "eeg",
        phase: 0,
        amp: 0.25,
        hz: this.midiToHz(this.root),
        spikeI: 0,
        live: t.mute ? 0 : 1,
        slow: 0,
        fast: 0,
        hammer: 0,
        lastMidi: this.root,
        grit: 0,
        prevVn: 0,
      }));
    } else if (msg.type === "params") {
      const map = {};
      for (const p of msg.tracks || []) map[p.id] = p;
      for (const t of this.tracks) {
        const p = map[t.id];
        if (!p) continue;
        t.pan = p.pan;
        t.gain = p.gain;
        t.mute = !!p.mute;
        t.solo = !!p.solo;
      }
    } else if (msg.type === "settings") {
      this.timeScale = Math.max(0.25, msg.timeScale || 2);
      this.root = msg.rootMidi || 50;
      this.range = msg.rangeSemitones || 8;
      this.negativeUp = msg.negativeUp ? 1 : 0;
      this.quantize = msg.quantize ? 1 : 0;
      this.degrees = msg.degrees || [0, 3, 5, 7, 10];
      this.mode = msg.mode || "contour";
      this.volume = Math.max(0.05, Math.min(2.5, msg.volume == null ? 1.45 : msg.volume));
    } else if (msg.type === "play") {
      this.playing = true;
      this.eegStart = msg.eegTime || 0;
      this.audioStart = currentTime;
    } else if (msg.type === "pause") {
      this.eegT = this.nowEeg();
      this.playing = false;
    } else if (msg.type === "seek") {
      this.eegT = Math.max(0, msg.eegTime || 0);
      this.eegStart = this.eegT;
      this.audioStart = currentTime;
      for (const t of this.tracks) t.spikeI = 0;
    }
  }

  nowEeg() {
    if (!this.playing) return this.eegT;
    return this.eegStart + (currentTime - this.audioStart) * this.timeScale;
  }

  stereo(sample, pan) {
    const gL = 0.7071 * (1 - pan);
    const gR = 0.7071 * (1 + pan);
    return [sample * gL, sample * gR];
  }

  contourVoice(vn, state, pan, gain, vg, sr, detune) {
    const signed = this.negativeUp ? vn : -vn;
    let midi = this.root + Math.max(-1, Math.min(1, signed)) * this.range;
    if (this.quantize) midi = this.quantizeMidi(midi);
    const thz = this.midiToHz(midi) * detune;
    state.hz += 0.012 * (thz - state.hz);
    const targetAmp = 0.28 + 0.72 * Math.min(1, Math.abs(vn) * 1.4);
    state.amp += 0.05 * (targetAmp - state.amp);
    state.phase += (2 * Math.PI * state.hz) / sr;
    if (state.phase > 1e8) state.phase -= 2 * Math.PI * 8000;
    const bright = Math.max(0, signed);
    const dark = Math.max(0, -signed);
    const s = Math.sin(state.phase);
    const harm = Math.sin(state.phase * 2) * 0.18 * bright;
    const sub = Math.sin(state.phase * 0.5) * 0.3 * dark;
    return this.stereo((s + harm + sub) * state.amp * vg * gain, pan);
  }

  pulseVoice(vn, state, pan, gain, vg, sr, midi) {
    const thz = this.midiToHz(midi);
    state.hz += 0.02 * (thz - state.hz);
    const targetAmp = 0.26 + 0.74 * Math.min(1, Math.abs(vn) * 1.5);
    state.amp += 0.045 * (targetAmp - state.amp);
    state.phase += (2 * Math.PI * state.hz) / sr;
    if (state.phase > 1e8) state.phase -= 2 * Math.PI * 8000;
    const s = (Math.sin(state.phase) + 0.12 * Math.sin(state.phase * 2)) * state.amp * vg * gain;
    return this.stereo(s, pan);
  }

  pianoVoice(vn, state, pan, gain, vg, sr, detune, spikeEnv) {
    const signed = this.negativeUp ? vn : -vn;
    const aFast = 1 - Math.exp(-this.timeScale / (sr * 0.01));
    const aSlow = 1 - Math.exp(-this.timeScale / (sr * 0.09));
    state.fast += aFast * (vn - state.fast);
    state.slow += aSlow * (vn - state.slow);
    const abs = Math.abs(vn);
    const transient = Math.abs(state.fast - state.slow);
    const slowAbs = Math.abs(state.slow);
    let kind = "ok";
    if (spikeEnv > 0.25 || (transient > 0.22 && abs > 0.28)) kind = "spike";
    else if (slowAbs > 0.34 && transient < 0.08) kind = "slow";
    else if (transient > 0.18 && slowAbs < 0.22) kind = "grit";

    let midi = this.root + Math.max(-1, Math.min(1, signed)) * this.range;
    midi = this.quantizeMidi(midi);
    if (kind === "spike") midi += 6;
    else if (kind === "slow") midi -= 0.7;
    else if (kind === "grit") midi += 0.35;

    if (Math.abs(midi - state.lastMidi) > 0.45 || spikeEnv > 0.55) {
      state.hammer = 1;
      state.lastMidi = midi;
    }
    state.hammer *= Math.exp(-1 / (0.085 * sr));

    const thz = this.midiToHz(midi) * detune;
    const slew = kind === "spike" ? 0.09 : 0.028;
    state.hz += slew * (thz - state.hz);
    const targetAmp = 0.34 + 0.66 * Math.min(1, abs * 1.45);
    state.amp += 0.06 * (targetAmp - state.amp);
    state.phase += (2 * Math.PI * state.hz) / sr;
    if (state.phase > 1e8) state.phase -= 2 * Math.PI * 8000;
    const p = state.phase;
    let s =
      Math.sin(p) +
      0.52 * Math.sin(2 * p) +
      0.26 * Math.sin(3 * p) +
      0.13 * Math.sin(4 * p) +
      0.07 * Math.sin(5 * p);
    if (kind === "spike") {
      s += 0.42 * Math.sin(2.14 * p) + 0.28 * Math.sin(3.61 * p);
      s += state.hammer * 0.7 * Math.sin(7 * p);
    } else if (kind === "slow") {
      s += 0.32 * Math.sin(1.97 * p);
    } else if (kind === "grit") {
      state.grit = state.grit * 0.94 + Math.sin(p * 11.3) * 0.08;
      s += 0.55 * state.grit;
    } else {
      s += state.hammer * 0.28 * Math.sin(p);
    }
    const sample = s * state.amp * vg * gain * (0.85 + 0.35 * state.hammer);
    return this.stereo(sample, pan);
  }

  /** Analog pen-on-paper: velocity of the tracing is the scratch (Norata 2023). */
  penVoice(vn, state, pan, gain, vg, sr) {
    const vel = vn - (state.prevVn || 0);
    state.prevVn = vn;
    const speed = Math.min(1, Math.abs(vel) * 16);
    state.amp += 0.07 * (0.12 + 0.88 * speed - state.amp);
    const signed = this.negativeUp ? vn : -vn;
    const thz = 580 + speed * 1620 + signed * 220;
    state.hz += 0.045 * (thz - state.hz);
    state.phase += (2 * Math.PI * state.hz) / sr;
    if (state.phase > 1e8) state.phase -= 2 * Math.PI * 8000;
    this.noise = this.noise * 0.92 + (((Math.sin(state.phase * 12.9898 + vn * 78.23) * 43758.5453) % 1) + 1) * 0.04;
    const paper = (this.noise * 2 - 1) * (0.3 + 0.7 * speed);
    const scratch = Math.sin(state.phase) * speed;
    const grain = Math.sin(state.phase * 3.17) * speed * 0.22;
    const sample = (scratch * 0.55 + paper * 0.38 + grain * 0.22) * state.amp * vg * gain * 1.35;
    return this.stereo(sample, pan);
  }

  voice(mode, vn, state, pan, gain, vg, sr, detune, midiFixed, spikeEnv) {
    if (mode === "pulse") return this.pulseVoice(vn, state, pan, gain, vg, sr, midiFixed);
    if (mode === "piano") return this.pianoVoice(vn, state, pan, gain, vg, sr, detune, spikeEnv);
    if (mode === "pen") return this.penVoice(vn, state, pan, gain, vg, sr);
    return this.contourVoice(vn, state, pan, gain, vg, sr, detune);
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const L = out[0];
    const R = out[1] || out[0];
    const n = L.length;
    const sr = sampleRate;
    const piano = this.mode === "piano";
    const pen = this.mode === "pen";
    const lpHz = pen ? 3400 : piano ? 2600 : this.mode === "direct" ? 1800 : this.mode === "choir" ? 1600 : 1100;
    const lpA = 1 - Math.exp((-2 * Math.PI * lpHz) / sr);
    const a4 = 1 - Math.exp((-2 * Math.PI * 4) / sr);
    const a8 = 1 - Math.exp((-2 * Math.PI * 8) / sr);
    const a13 = 1 - Math.exp((-2 * Math.PI * 13) / sr);
    const a30 = 1 - Math.exp((-2 * Math.PI * 30) / sr);
    const anySolo = this.tracks.some((t) => t.solo);
    const liveA = 0.012;
    for (const t of this.tracks) {
      const want = !t.mute && (!anySolo || t.solo) ? 1 : 0;
      t.live += liveA * (want - t.live);
      if (t.live < 0.0008 && want === 0) t.live = 0;
    }

    const eeg = [];
    const aux = [];
    let eegWant = 0;
    for (const t of this.tracks) {
      if (!t.voltage || !t.voltage.length) continue;
      if (t.kind === "ekg" || t.kind === "eog") {
        aux.push(t);
        continue;
      }
      if (t.kind === "extra") continue;
      eeg.push(t);
      if (t.live > 0.02) eegWant++;
    }
    const useGroups = eegWant > 3;
    const vg = useGroups ? 0.62 : eegWant ? 0.78 / Math.sqrt(Math.max(1, eegWant)) : 0.55;
    const dtEeg = this.timeScale / sr;
    const rootHz = this.midiToHz(this.root);
    const choirRatio = [1, 1.25, 1.5, 2];
    const pitched = this.mode === "contour" || this.mode === "pulse" || piano || pen;

    for (let i = 0; i < n; i++) {
      const eegT = this.playing ? this.nowEeg() + i * dtEeg : this.eegT;
      let l = 0;
      let r = 0;
      if (this.playing && eegT <= this.eegDuration) {
        let lV = 0;
        let rV = 0;
        let mV = 0;
        let lN = 0;
        let rN = 0;
        let mN = 0;
        let spikeEnv = 0;

        for (let k = 0; k < this.tracks.length; k++) {
          const t = this.tracks[k];
          const sp = t.spikes;
          if (!sp || !sp.length || t.live < 0.05) continue;
          while (t.spikeI < sp.length && sp[t.spikeI] < eegT - 0.09) t.spikeI++;
          if (t.spikeI > 0 && sp[t.spikeI - 1] > eegT + 0.02) t.spikeI = Math.max(0, t.spikeI - 6);
          if (t.spikeI < sp.length) {
            const dt = eegT - sp[t.spikeI];
            if (dt >= 0 && dt < 0.08) spikeEnv = Math.max(spikeEnv, Math.exp(-dt * 36) * t.live);
          }
        }

        for (let k = 0; k < eeg.length; k++) {
          const t = eeg[k];
          if (t.live <= 0.001) continue;
          const raw = this.interp(t.voltage, eegT * t.rate);
          const vn = Math.max(-1, Math.min(1, raw * t.scale));
          const w = t.live * t.gain;
          if (t.pan < -0.25) {
            lV += vn * w;
            lN++;
          } else if (t.pan > 0.25) {
            rV += vn * w;
            rN++;
          } else {
            mV += vn * w;
            mN++;
          }
          if (!useGroups && pitched) {
            const midiOff = t.pan < -0.25 ? 0 : t.pan > 0.25 ? 7 : 3;
            const pair = this.voice(this.mode, vn, t, t.pan, 1, vg, sr, 1, this.root + midiOff, spikeEnv);
            l += pair[0];
            r += pair[1];
          }
        }
        const gV = [lN ? lV / lN : 0, rN ? rV / rN : 0, mN ? mV / mN : 0];
        const gPan = [-0.85, 0.85, 0];
        const gDetune = [0.998, 1.002, 1];
        const gMidi = [this.root, this.root + 7, this.root + 3];
        const gLive = [lN > 0 ? 1 : 0, rN > 0 ? 1 : 0, mN > 0 ? 1 : 0];
        for (let g = 0; g < 3; g++) this.g[g].live += 0.02 * (gLive[g] - this.g[g].live);

        if (this.mode === "direct") {
          l += (gV[0] * 0.7 + gV[2] * 0.35) * 0.85;
          r += (gV[1] * 0.7 + gV[2] * 0.35) * 0.85;
        } else if (this.mode === "choir") {
          const mix = (gV[0] + gV[1] + gV[2]) / Math.max(1, gLive[0] + gLive[1] + gLive[2]);
          this.bandLp[0] += a4 * (mix - this.bandLp[0]);
          this.bandLp[1] += a8 * (mix - this.bandLp[1]);
          this.bandLp[2] += a13 * (mix - this.bandLp[2]);
          this.bandLp[3] += a30 * (mix - this.bandLp[3]);
          const bands = [
            this.bandLp[0],
            this.bandLp[1] - this.bandLp[0],
            this.bandLp[2] - this.bandLp[1],
            this.bandLp[3] - this.bandLp[2],
          ];
          const lE = Math.abs(gV[0]) + 0.35 * Math.abs(gV[2]);
          const rE = Math.abs(gV[1]) + 0.35 * Math.abs(gV[2]);
          const tot = lE + rE + 1e-6;
          const panL = (rE - lE) / tot;
          for (let b = 0; b < 4; b++) {
            this.choirEnv[b] += 0.018 * (Math.min(1, Math.abs(bands[b]) * 2.6) - this.choirEnv[b]);
            const hz = rootHz * choirRatio[b];
            this.choirPhase[b] += (2 * Math.PI * hz) / sr;
            const oneOverF = 1 / (b + 1);
            const s =
              (Math.sin(this.choirPhase[b]) + 0.08 * Math.sin(this.choirPhase[b] * 2)) *
              this.choirEnv[b] *
              0.72 *
              oneOverF;
            l += s * 0.7071 * (1 - panL * 0.6);
            r += s * 0.7071 * (1 + panL * 0.6);
          }
        } else if (useGroups) {
          for (let g = 0; g < 3; g++) {
            if (this.g[g].live < 0.01) continue;
            const pair = this.voice(
              this.mode,
              gV[g],
              this.g[g],
              gPan[g],
              this.g[g].live,
              0.7,
              sr,
              gDetune[g],
              gMidi[g],
              spikeEnv,
            );
            l += pair[0];
            r += pair[1];
          }
        }

        for (let k = 0; k < aux.length; k++) {
          const t = aux[k];
          if (t.live <= 0.001) continue;
          const raw = this.interp(t.voltage, eegT * t.rate);
          const vn = Math.max(-1, Math.min(1, raw * t.scale));
          t.amp += 0.05 * (Math.min(1, Math.abs(vn) * 1.5) - t.amp);
          const gL = 0.7071 * (1 - t.pan);
          const gR = 0.7071 * (1 + t.pan);
          if (t.kind === "ekg") {
            this.ekgPhase += (2 * Math.PI * 56) / sr;
            const punch = t.amp * t.amp;
            const s = Math.sin(this.ekgPhase) * punch * 0.7 * t.live * t.gain;
            l += s * gL;
            r += s * gR;
          } else {
            this.eogPhase += (2 * Math.PI * 148) / sr;
            this.eogNoise = this.eogNoise * 0.97 + (((Math.sin(eegT * 9317) * 43758.5453) % 1) + 1) * 0.015;
            const s =
              (0.7 * Math.sin(this.eogPhase) + 0.18 * (this.eogNoise * 2 - 1)) * t.amp * 0.5 * t.live * t.gain;
            l += s * gL;
            r += s * gR;
          }
        }

        if (spikeEnv > 0 && !piano && !pen) {
          const tap = Math.sin(2 * Math.PI * 82 * eegT) * spikeEnv * 0.16;
          l += tap * 0.7;
          r += tap * 0.7;
        }
      }
      this.lpL += lpA * (l - this.lpL);
      this.lpR += lpA * (r - this.lpR);
      this.dcL = 0.996 * (this.dcL + this.lpL - this.prevL);
      this.dcR = 0.996 * (this.dcR + this.lpR - this.prevR);
      this.prevL = this.lpL;
      this.prevR = this.lpR;
      const mag = Math.abs(this.dcL) + Math.abs(this.dcR);
      this.comp += 0.0035 * (mag - this.comp);
      const makeup = Math.min(5.2, 0.7 / Math.max(0.1, this.comp));
      const drive = makeup * this.volume;
      L[i] = Math.tanh(this.dcL * drive);
      R[i] = Math.tanh(this.dcR * drive);
    }
    if (this.playing) {
      const t = this.nowEeg() + n * dtEeg;
      if (t >= this.eegDuration) {
        this.playing = false;
        this.eegT = this.eegDuration;
        this.port.postMessage({ type: "ended" });
      }
    }
    return true;
  }
}

registerProcessor("contour-synth", ContourProcessor);
