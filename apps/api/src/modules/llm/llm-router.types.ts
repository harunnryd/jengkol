export type LlmProviderName = 'anthropic' | 'openai';

export interface LlmProviderState {
  name: LlmProviderName;
  keys: string[];
  keyIndex: number;
  model: string;
}

export function isRetryableLlmError(error: unknown): boolean {
  const status =
    (error as { status?: number; response?: { status?: number } })?.status ??
    (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403 || status === 429;
}
