/** Bundled TUH EEG recording used as the workstation default. */
export const DEFAULT_RECORDING_FILE = "aaaaaaly_s003_t001.edf";

function bundledBaseUrl(): string {
  const env = (import.meta as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? "/";
}

export function defaultRecordingUrl(baseUrl = bundledBaseUrl()): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${DEFAULT_RECORDING_FILE}`;
}

export async function fetchDefaultRecording(): Promise<{ buffer: ArrayBuffer; name: string }> {
  const url = defaultRecordingUrl();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not open bundled recording ${DEFAULT_RECORDING_FILE} (${response.status}).`);
  }
  return { buffer: await response.arrayBuffer(), name: DEFAULT_RECORDING_FILE };
}
