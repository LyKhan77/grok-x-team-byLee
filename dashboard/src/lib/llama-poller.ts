import { SlotsSummary, SlotDetail } from './types';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';
const TIMEOUT_MS = 3000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/health`);
  return res.json();
}

export async function getSlots(): Promise<SlotsSummary> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/slots`);
  const raw: any[] = await res.json();

  const details: SlotDetail[] = raw.map((slot: any) => ({
    id: slot.id ?? slot.slot_id ?? 0,
    state: slot.is_processing ? 'processing' : 'idle',
    tokens_generated: slot.n_decoded ?? slot.tokens_predicted ?? 0,
    tps: slot.t_token_generation
      ? (slot.n_decoded / (slot.t_token_generation / 1000))
      : 0,
    client: slot.peer ?? null,
  }));

  const active = details.filter((s) => s.state !== 'idle').length;

  return {
    total: details.length,
    active,
    idle: details.length - active,
    details,
  };
}

export async function getProps(): Promise<Record<string, any>> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/props`);
  return res.json();
}
