import { SlotsSummary, SlotDetail } from './types';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';
const TIMEOUT_MS = 3000;

// Use global to persist across Next.js dev reloads
const globalPoller = global as unknown as {
  slotStates: Map<number, { timestamp: number; n_decoded: number; }>;
  totalTokens: number;
};

if (!globalPoller.slotStates) {
  globalPoller.slotStates = new Map();
  globalPoller.totalTokens = 0;
}

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
  try {
    const res = await fetchWithTimeout(`${LLAMA_URL}/health`);
    return await res.json();
  } catch (e) {
    return { status: 'error' };
  }
}

export async function getSlots(): Promise<SlotsSummary & { totalTokensToday: number }> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/slots`);
  const raw: any[] = await res.json();
  const now = Date.now();

  const details: SlotDetail[] = raw.map((slot: any) => {
    const id = slot.id ?? slot.slot_id ?? 0;
    const isProcessing = slot.is_processing;

    // Extract n_decoded. In newer llama.cpp, it's inside next_token array.
    let n_decoded = slot.n_decoded ?? slot.tokens_predicted ?? 0;
    if (slot.next_token && Array.isArray(slot.next_token) && slot.next_token.length > 0) {
      n_decoded = slot.next_token[0].n_decoded ?? n_decoded;
    }

    let tps = 0;
    const prevState = globalPoller.slotStates.get(id);

    if (isProcessing) {
      if (prevState) {
        const deltaTokens = n_decoded - prevState.n_decoded;
        const deltaMs = now - prevState.timestamp;
        
        if (deltaMs > 0 && deltaTokens > 0) {
          tps = deltaTokens / (deltaMs / 1000);
          globalPoller.totalTokens += deltaTokens;
        } else if (deltaTokens < 0) {
          // Reset (new request started in the same slot)
          globalPoller.totalTokens += n_decoded;
        }
      } else {
        // First time we see it processing
        globalPoller.totalTokens += n_decoded;
      }
      
      // Cap TPS to avoid crazy spikes on first poll
      if (tps > 200) tps = 0;

      globalPoller.slotStates.set(id, { timestamp: now, n_decoded });
    } else {
      // Idle
      globalPoller.slotStates.delete(id);
    }

    return {
      id,
      state: isProcessing ? 'processing' : 'idle',
      tokens_generated: n_decoded,
      tps,
      client: slot.peer ?? '-',
    };
  });

  const active = details.filter((s) => s.state !== 'idle').length;

  return {
    total: details.length,
    active,
    idle: details.length - active,
    details,
    totalTokensToday: globalPoller.totalTokens,
  };
}

export async function getProps(): Promise<Record<string, any>> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/props`);
  return res.json();
}
