/// <reference lib="webworker" />

import {
  detectDeterministicAnnotations,
  type ScreeningProgress,
  type ScreeningChannel,
} from "../lib/eeg/abnormality/screening.ts";

interface ScreeningWorkerRequest {
  channels: ScreeningChannel[];
  durationSeconds: number;
}

self.onmessage = (event: MessageEvent<ScreeningWorkerRequest>) => {
  try {
    const annotations = detectDeterministicAnnotations(
      event.data.channels,
      event.data.durationSeconds,
      {
        onProgress: (progress: ScreeningProgress) => {
          self.postMessage({ progress: progress.fraction });
        },
      },
    );
    self.postMessage({ annotations });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Deterministic screening failed",
    });
  }
};

export {};
