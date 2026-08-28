/** Synthetic EEG generators used by tests and the in-app pattern lab. */

export function sine(freq: number, fs: number, seconds: number, amp = 1, phase = 0): Float32Array {
  const n = Math.round(seconds * fs);
  const y = new Float32Array(n);
  const w = (2 * Math.PI * freq) / fs;
  for (let i = 0; i < n; i++) y[i] = amp * Math.sin(w * i + phase);
  return y;
}

export function spikeAndWave(fs: number, seconds: number): Float32Array {
  const n = Math.round(seconds * fs);
  const y = new Float32Array(n);
  const f = 3;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const slow = 0.6 * Math.sin(2 * Math.PI * f * t);
    const cycle = (t * f) % 1;
    const spike = cycle < 0.08 ? 1.8 * Math.exp(-cycle * 40) * Math.sin(2 * Math.PI * 18 * t) : 0;
    y[i] = slow + spike;
  }
  return y;
}

export function burstSuppression(fs: number, seconds: number): Float32Array {
  const n = Math.round(seconds * fs);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const inBurst = t % 2.0 < 0.45;
    y[i] = inBurst ? 0.8 * Math.sin(2 * Math.PI * 12 * t) + 0.3 * Math.sin(2 * Math.PI * 22 * t) : 0.02 * Math.sin(2 * Math.PI * 2 * t);
  }
  return y;
}

export function chirp(fs: number, seconds: number, f0 = 2, f1 = 30): Float32Array {
  const n = Math.round(seconds * fs);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const frac = t / seconds;
    const inst = f0 + (f1 - f0) * frac;
    y[i] = Math.sin(2 * Math.PI * ((f0 + inst) / 2) * t);
  }
  return y;
}

export function muscleNoise(fs: number, seconds: number): Float32Array {
  const n = Math.round(seconds * fs);
  const y = new Float32Array(n);
  let s = 1;
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    const white = (s / 2147483647) * 2 - 1;
    y[i] = 0.15 * Math.sin(2 * Math.PI * 10 * (i / fs)) + 0.7 * white;
  }
  return y;
}

export function electrodePop(fs: number, seconds: number, at = 0.5): Float32Array {
  const n = Math.round(seconds * fs);
  const y = sine(10, fs, seconds, 0.2);
  const k = Math.round(at * fs);
  if (k >= 0 && k < n) {
    const width = Math.round(0.04 * fs);
    for (let i = 0; i < width && k + i < n; i++) {
      y[k + i]! += 4 * Math.exp(-i / (0.01 * fs));
    }
  }
  return y;
}

export function goertzel(x: Float32Array, fs: number, freq: number): number {
  const k = Math.round((x.length * freq) / fs);
  const w = (2 * Math.PI * k) / x.length;
  const cosine = Math.cos(w);
  const sineV = Math.sin(w);
  const coeff = 2 * cosine;
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;
  for (let i = 0; i < x.length; i++) {
    q0 = coeff * q1 - q2 + x[i]!;
    q2 = q1;
    q1 = q0;
  }
  const real = q1 - q2 * cosine;
  const imag = q2 * sineV;
  return Math.hypot(real, imag);
}

function pad(s: string, n: number): string {
  return (s + " ".repeat(n)).slice(0, n);
}

export function buildSyntheticEdf(opts: {
  duration: number;
  recordDuration?: number;
  left?: Float32Array;
  right?: Float32Array;
  midline?: Float32Array;
}): ArrayBuffer {
  const recDur = opts.recordDuration ?? 0.1;
  const fs = 200;
  const nsp = Math.round(fs * recDur);
  const nrec = Math.round(opts.duration / recDur);
  const labels = ["EEG Fp1", "EEG Fp2", "EEG Fz", "EEG T3", "EEG T4", "EDF Annotations"];
  const nsig = labels.length;
  const headerBytes = 256 + nsig * 256;
  const annotNsp = 25;
  const bytesPerRec = (nsig - 1) * nsp * 2 + annotNsp * 2;
  const buffer = new ArrayBuffer(headerBytes + nrec * bytesPerRec);
  const view = new DataView(buffer);
  const write = (off: number, s: string, n: number) => {
    const p = pad(s, n);
    for (let i = 0; i < n; i++) view.setUint8(off + i, p.charCodeAt(i));
  };
  write(0, "0", 8);
  write(8, "X X X X", 80);
  write(88, "Startdate 01-JAN-2000 X X Synthetic", 80);
  write(168, "01.01.00", 8);
  write(176, "00.00.00", 8);
  write(184, String(headerBytes), 8);
  write(192, "EDF+C", 44);
  write(236, String(nrec), 8);
  write(244, String(recDur), 8);
  write(252, String(nsig), 4);

  const field = (block: number, width: number, i: number, s: string) => {
    write(256 + block + i * width, s, width);
  };
  // Compute block offsets
  const ns = nsig;
  let cursor = 0;
  const place = (width: number, values: string[]) => {
    const off = cursor;
    values.forEach((v, i) => field(off, width, i, v));
    cursor += width * ns;
  };
  place(
    16,
    labels.map((l) => l),
  );
  place(80, labels.map(() => ""));
  place(8, ["uV", "uV", "uV", "uV", "uV", ""]);
  place(8, ["-3200", "-3200", "-3200", "-3200", "-3200", "-1"]);
  place(8, ["3200", "3200", "3200", "3200", "3200", "1"]);
  place(8, ["-32768", "-32768", "-32768", "-32768", "-32768", "-32768"]);
  place(8, ["32767", "32767", "32767", "32767", "32767", "32767"]);
  place(80, labels.map(() => ""));
  place(8, [String(nsp), String(nsp), String(nsp), String(nsp), String(nsp), String(annotNsp)]);
  place(32, labels.map(() => ""));

  const physToDig = (uV: number) => {
    const d = ((uV - -3200) / 6400) * (32767 - -32768) + -32768;
    return Math.max(-32768, Math.min(32767, Math.round(d)));
  };

  const L = opts.left ?? sine(10, fs, opts.duration, 50);
  const R = opts.right ?? sine(10, fs, opts.duration, 50);
  const M = opts.midline ?? sine(10, fs, opts.duration, 20);

  for (let r = 0; r < nrec; r++) {
    let off = headerBytes + r * bytesPerRec;
    const writeCh = (src: Float32Array) => {
      for (let i = 0; i < nsp; i++) {
        const idx = r * nsp + i;
        view.setInt16(off, physToDig(src[idx] ?? 0), true);
        off += 2;
      }
    };
    writeCh(L);
    writeCh(R);
    writeCh(M);
    writeCh(L);
    writeCh(R);
    // empty TAL
    for (let i = 0; i < annotNsp; i++) {
      view.setInt16(off, 0, true);
      off += 2;
    }
  }
  return buffer;
}
