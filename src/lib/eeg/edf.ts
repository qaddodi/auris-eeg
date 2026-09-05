import { describeChannel } from "./channels.ts";
import type {
  ChannelInfo,
  EdfAnnotation,
  EdfHeader,
  EdfSignal,
  LoadedRecording,
} from "./types.ts";

function ascii(buf: ArrayBuffer, start: number, len: number): string {
  const bytes = new Uint8Array(buf, start, len);
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]!;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function looksIdentifying(patient: string, recording: string): boolean {
  const blob = `${patient} ${recording}`.toLowerCase();
  if (!blob.trim()) return false;
  const tokens = blob.split(/\s+/).filter((t) => t && t !== "x" && t !== "xx");
  // EDF+ deidentified form is "X X X X"
  const nonX = tokens.filter((t) => t !== "x");
  if (nonX.length === 0) return false;
  if (/\b(mr|ms|mrs|dr|patient|name)\b/.test(blob)) return true;
  if (/[a-z]{3,}/.test(patient) && !/^x(\s+x)*$/i.test(patient)) return true;
  return patient.length > 0 && !/^x(\s+x)*$/i.test(patient.trim());
}

function parseSignalHeaders(buffer: ArrayBuffer, nsig: number): EdfSignal[] {
  let off = 256;
  const take = (width: number): string[] => {
    const arr: string[] = [];
    for (let i = 0; i < nsig; i++) {
      arr.push(ascii(buffer, off, width));
      off += width;
    }
    return arr;
  };
  const labels = take(16);
  const transducers = take(80);
  const units = take(8);
  const pmins = take(8);
  const pmaxs = take(8);
  const dmins = take(8);
  const dmaxs = take(8);
  const prefilters = take(80);
  const nsps = take(8);
  const reserveds = take(32);

  const signals: EdfSignal[] = [];
  for (let i = 0; i < nsig; i++) {
    const label = labels[i]!;
    const samplesPerRecord = Number(nsps[i]);
    const isAnnotation = /edf\s*annotations/i.test(label);
    signals.push({
      index: i,
      label,
      transducer: transducers[i]!,
      unit: units[i]!,
      physicalMin: Number(pmins[i]),
      physicalMax: Number(pmaxs[i]),
      digitalMin: Number(dmins[i]),
      digitalMax: Number(dmaxs[i]),
      prefilter: prefilters[i]!,
      samplesPerRecord: Number.isFinite(samplesPerRecord) ? samplesPerRecord : 0,
      reserved: reserveds[i]!,
      sampleRate: 0,
      isAnnotation,
    });
  }
  return signals;
}

function requireFiniteField(value: number, field: string, signal?: number): void {
  if (!Number.isFinite(value)) {
    const suffix = signal == null ? "" : ` for signal ${signal + 1}`;
    throw new Error(`EDF ${field}${suffix} is missing or invalid.`);
  }
}

export function parseEdfHeader(buffer: ArrayBuffer): EdfHeader {
  if (buffer.byteLength < 256) {
    throw new Error("File is too small to be an EDF/EDF+ recording.");
  }
  const version = ascii(buffer, 0, 8);
  if (version !== "0") throw new Error("Unsupported EDF version (expected version 0).");
  const patient = ascii(buffer, 8, 80);
  const recording = ascii(buffer, 88, 80);
  const startDate = ascii(buffer, 168, 8);
  const startTime = ascii(buffer, 176, 8);
  const headerBytes = Number(ascii(buffer, 184, 8));
  const reserved = ascii(buffer, 192, 44);
  const recordCount = Number(ascii(buffer, 236, 8));
  const recordDuration = Number(ascii(buffer, 244, 8));
  const nsig = Number(ascii(buffer, 252, 4));

  if (!Number.isFinite(nsig) || nsig < 1 || nsig > 512) {
    throw new Error("This file does not look like a valid EDF header (signal count).");
  }
  if (!Number.isInteger(headerBytes) || headerBytes !== 256 + nsig * 256) {
    throw new Error("EDF header size does not match the signal count.");
  }
  if (buffer.byteLength < headerBytes) {
    throw new Error("EDF file is truncated in the signal header.");
  }
  if (!Number.isFinite(recordDuration) || recordDuration <= 0) {
    throw new Error("EDF record duration is missing or invalid.");
  }
  if (!Number.isInteger(recordCount) || recordCount < -1 || recordCount === 0) {
    throw new Error("EDF data-record count is invalid.");
  }

  const signals = parseSignalHeaders(buffer, nsig);
  for (const s of signals) {
    requireFiniteField(s.physicalMin, "physical minimum", s.index);
    requireFiniteField(s.physicalMax, "physical maximum", s.index);
    requireFiniteField(s.digitalMin, "digital minimum", s.index);
    requireFiniteField(s.digitalMax, "digital maximum", s.index);
    if (!Number.isInteger(s.digitalMin) || !Number.isInteger(s.digitalMax) ||
        s.digitalMin < -32768 || s.digitalMin > 32767 ||
        s.digitalMax < -32768 || s.digitalMax > 32767) {
      throw new Error(`EDF digital calibration is outside the signed 16-bit range for signal ${s.index + 1}.`);
    }
    if (s.physicalMin === s.physicalMax || s.digitalMin === s.digitalMax) {
      throw new Error(`EDF calibration range is zero for signal ${s.index + 1}.`);
    }
    if (!Number.isInteger(s.samplesPerRecord) || s.samplesPerRecord < 1) {
      throw new Error(`EDF samples per record is invalid for signal ${s.index + 1}.`);
    }
    s.sampleRate = s.samplesPerRecord / recordDuration;
  }
  const bytesPerRecord = signals.reduce((a, s) => a + s.samplesPerRecord * 2, 0);
  const payloadBytes = buffer.byteLength - headerBytes;
  if (payloadBytes < 0 || payloadBytes % bytesPerRecord !== 0) {
    throw new Error("EDF data section contains a truncated or partial data record.");
  }
  const completeRecords = payloadBytes / bytesPerRecord;
  const resolvedRecordCount = recordCount === -1 ? completeRecords : recordCount;
  if (resolvedRecordCount < 1) {
    throw new Error("EDF has no complete data records.");
  }
  if (resolvedRecordCount !== completeRecords) {
    throw new Error("EDF data-record count does not match the file length.");
  }
  if (/^EDF\+D(?:\s|$)/i.test(reserved)) {
    throw new Error("Discontinuous EDF+D recordings are not supported because gaps cannot be represented safely.");
  }

  return {
    version,
    identifierWarning: looksIdentifying(patient, recording),
    startDate,
    startTime,
    headerBytes,
    reserved,
    recordCount: resolvedRecordCount,
    recordDuration,
    duration: resolvedRecordCount * recordDuration,
    signals,
    bytesPerRecord,
    isEdfPlus: reserved.toUpperCase().startsWith("EDF+"),
  };
}

export function listChannels(header: EdfHeader): ChannelInfo[] {
  return header.signals
    .filter((s) => !s.isAnnotation)
    .map((s) => describeChannel(s.index, s.label, s.unit, s.sampleRate));
}

function physical(s: EdfSignal, digital: number): number {
  const spanD = s.digitalMax - s.digitalMin;
  const calibrated = ((digital - s.digitalMin) / spanD) * (s.physicalMax - s.physicalMin) + s.physicalMin;
  // The rest of the EEG pipeline and its sensitivity controls use microvolts.
  const unit = s.unit.trim().toLowerCase().replace("μ", "µ");
  const kind = describeChannel(s.index, s.label, s.unit, s.sampleRate).kind;
  if (kind === "eeg" || kind === "eog" || kind === "emg" || kind === "ekg") {
    if (unit === "v") return calibrated * 1e6;
    if (unit === "mv") return calibrated * 1e3;
    if (unit === "uv" || unit === "µv") return calibrated;
    if (unit === "nv") return calibrated * 1e-3;
  }
  return calibrated;
}

export function readRecords(
  buffer: ArrayBuffer,
  header: EdfHeader,
  startSec: number,
  durationSec: number,
): { samples: Float32Array[]; start: number; duration: number } {
  const startRec = Math.max(0, Math.floor(startSec / header.recordDuration));
  const nRecWanted = Math.max(1, Math.ceil(durationSec / header.recordDuration));
  const nRec = Math.min(nRecWanted, header.recordCount - startRec);
  if (nRec <= 0) {
    throw new Error("Requested interval is outside the recording.");
  }

  const view = new DataView(buffer);
  const nsig = header.signals.length;
  const out: Float32Array[] = header.signals.map((s) => new Float32Array(s.samplesPerRecord * nRec));
  const offsets: number[] = [];
  let run = 0;
  for (const s of header.signals) {
    offsets.push(run);
    run += s.samplesPerRecord * 2;
  }

  for (let r = 0; r < nRec; r++) {
    const recOff = header.headerBytes + (startRec + r) * header.bytesPerRecord;
    if (recOff + header.bytesPerRecord > buffer.byteLength) break;
    for (let c = 0; c < nsig; c++) {
      const sig = header.signals[c]!;
      const dest = out[c]!;
      const base = recOff + offsets[c]!;
      const destOff = r * sig.samplesPerRecord;
      if (sig.isAnnotation) {
        // Keep raw int16 in the float buffer for TAL parsing (as digital).
        for (let i = 0; i < sig.samplesPerRecord; i++) {
          dest[destOff + i] = view.getInt16(base + i * 2, true);
        }
      } else {
        for (let i = 0; i < sig.samplesPerRecord; i++) {
          const d = view.getInt16(base + i * 2, true);
          dest[destOff + i] = physical(sig, d);
        }
      }
    }
  }

  return {
    samples: out,
    start: startRec * header.recordDuration,
    duration: nRec * header.recordDuration,
  };
}

function parseTals(bytes: Uint8Array): EdfAnnotation[] {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const out: EdfAnnotation[] = [];
  const chunks = text.split("\0").filter(Boolean);
  for (const chunk of chunks) {
    // TAL: +onset[\x15duration]\x14annotation[\x14annotation...]\x14
    const parts = chunk.split("\x14");
    if (!parts[0]) continue;
    const head = parts[0];
    const durSplit = head.split("\x15");
    if (durSplit.length > 2 || !/^[+-](?:\d+(?:\.\d*)?|\.\d+)$/.test(durSplit[0]!)) {
      throw new Error("EDF+ annotation onset is invalid.");
    }
    const onset = Number(durSplit[0]);
    if (!Number.isFinite(onset)) throw new Error("EDF+ annotation onset is invalid.");
    if (durSplit[1] != null && durSplit[1] !== "" && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(durSplit[1])) {
      throw new Error("EDF+ annotation duration is invalid.");
    }
    const duration = durSplit[1] != null && durSplit[1] !== "" ? Number(durSplit[1]) : null;
    if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
      throw new Error("EDF+ annotation duration is invalid.");
    }
    const anns = parts.slice(1).map((s) => s.replace(/\0/g, "").trim()).filter(Boolean);
    if (anns.length === 0) {
      out.push({ onset, duration, text: "" });
    } else {
      for (const a of anns) {
        out.push({ onset, duration, text: a });
      }
    }
  }
  return out;
}

export function readAnnotations(buffer: ArrayBuffer, header: EdfHeader): EdfAnnotation[] {
  const annotationIndexes = header.signals.flatMap((s, index) => s.isAnnotation ? [index] : []);
  if (annotationIndexes.length === 0) return [];
  const view = new DataView(buffer);
  const offsets: number[] = [];
  let run = 0;
  for (const s of header.signals) {
    offsets.push(run);
    run += s.samplesPerRecord * 2;
  }
  const out: EdfAnnotation[] = [];
  const nRec = header.recordCount;
  for (let r = 0; r < nRec; r++) {
    const recOff = header.headerBytes + r * header.bytesPerRecord;
    for (const idx of annotationIndexes) {
      const sig = header.signals[idx]!;
      const base = recOff + offsets[idx]!;
      const bytes = new Uint8Array(sig.samplesPerRecord * 2);
      for (let i = 0; i < sig.samplesPerRecord; i++) {
        const v = view.getInt16(base + i * 2, true);
        bytes[i * 2] = v & 0xff;
        bytes[i * 2 + 1] = (v >> 8) & 0xff;
      }
      out.push(...parseTals(bytes));
    }
  }
  return out.filter((a) => a.text);
}

export async function loadRecording(file: File | ArrayBuffer, name: string): Promise<LoadedRecording> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const header = parseEdfHeader(buffer);
  const annotations = readAnnotations(buffer, header);
  return { name, header, buffer, annotations };
}

export function sampleRateSummary(header: EdfHeader): { unique: number[]; mixed: boolean; primary: number } {
  const rates = [
    ...new Set(
      header.signals.filter((s) => !s.isAnnotation).map((s) => Math.round(s.sampleRate * 1000) / 1000),
    ),
  ];
  const eegRates = header.signals
    .filter((s) => !s.isAnnotation && /uv/i.test(s.unit))
    .map((s) => s.sampleRate);
  const primary = eegRates[0] ?? rates[0] ?? 0;
  return { unique: rates, mixed: rates.length > 1, primary };
}
