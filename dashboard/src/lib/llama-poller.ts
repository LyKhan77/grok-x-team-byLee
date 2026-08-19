import { SlotsSummary, SlotDetail, CompletedTask } from './types';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';
const TIMEOUT_MS = 3000;

// Use global to persist across Next.js dev reloads
const globalPoller = global as unknown as {
  slotStates: Map<number, { timestamp: number; startTimestamp: number; n_decoded: number; clientIp?: string }>;
  totalTokens: number;
  pendingIps: string[];
  completedTasks: CompletedTask[];
};

if (!globalPoller.slotStates) {
  globalPoller.slotStates = new Map();
  globalPoller.totalTokens = 0;
  globalPoller.pendingIps = [];
  globalPoller.completedTasks = [];
}

export function registerClientIp(ip: string) {
  globalPoller.pendingIps.push(ip);
  // Keep queue bounded to prevent memory leaks
  if (globalPoller.pendingIps.length > 50) {
    globalPoller.pendingIps.shift();
  }
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
    const prompt_tokens = slot.n_prompt_tokens ?? 0;

    // Heuristics for request type
    let request_type = 'Code Generation';
    const params = slot.params || {};
    if (params.reasoning_format || (params.generation_prompt && params.generation_prompt.includes('<think>'))) {
      request_type = 'Reasoning CoT';
    } else if (prompt_tokens > 20000) {
      request_type = 'Large Refactoring';
    } else if (prompt_tokens < 1000) {
      request_type = 'Quick Q&A';
    }

    // Extract n_decoded. In newer llama.cpp, it's inside next_token array.
    let n_decoded = slot.n_decoded ?? slot.tokens_predicted ?? 0;
    if (slot.next_token && Array.isArray(slot.next_token) && slot.next_token.length > 0) {
      n_decoded = slot.next_token[0].n_decoded ?? n_decoded;
    }

    let tps = 0;
    let duration_ms = 0;
    let clientIp = 'Unknown IP';
    const prevState = globalPoller.slotStates.get(id);

    if (isProcessing) {
      let startTimestamp = now;
      if (prevState) {
        startTimestamp = prevState.startTimestamp;
        clientIp = prevState.clientIp || 'Unknown IP';
        const deltaTokens = n_decoded - prevState.n_decoded;
        const deltaMs = now - prevState.timestamp;
        
        if (deltaMs > 0 && deltaTokens > 0) {
          tps = deltaTokens / (deltaMs / 1000);
          globalPoller.totalTokens += deltaTokens;
        } else if (deltaTokens < 0) {
          // Reset (new request started in the same slot)
          globalPoller.totalTokens += n_decoded;
          startTimestamp = now; // reset start time too
          clientIp = globalPoller.pendingIps.shift() || 'Direct/Unknown';
        }
      } else {
        // First time we see it processing
        globalPoller.totalTokens += n_decoded;
        clientIp = globalPoller.pendingIps.shift() || 'Direct/Unknown';
      }
      
      duration_ms = now - startTimestamp;

      // Cap TPS to avoid crazy spikes on first poll
      if (tps > 200) tps = 0;

      globalPoller.slotStates.set(id, { timestamp: now, startTimestamp, n_decoded, clientIp });
    } else {
      // Idle
      if (prevState) {
        // A task just finished, record it to history
        const finalTps = prevState.n_decoded / Math.max((now - prevState.startTimestamp) / 1000, 1);
        
        globalPoller.completedTasks.unshift({
          task_id: slot.id_task ? String(slot.id_task) : '?',
          client: prevState.clientIp || 'Unknown',
          timestamp: now,
          duration_ms: now - prevState.startTimestamp,
          tokens_generated: prevState.n_decoded,
          prompt_tokens: prompt_tokens,
          tps: finalTps,
          request_type: request_type
        });

        // Cap history to 50 items
        if (globalPoller.completedTasks.length > 50) {
          globalPoller.completedTasks.pop();
        }
      }
      globalPoller.slotStates.delete(id);
    }

    // Determine final client string format
    const finalClient = isProcessing 
      ? `${clientIp} (Task #${slot.id_task || '?'})`
      : '-';

    return {
      id,
      state: isProcessing ? 'processing' : 'idle',
      tokens_generated: n_decoded,
      tps,
      client: finalClient,
      duration_ms,
      request_type,
      prompt_tokens
    };
  });

  const active = details.filter((s) => s.state !== 'idle').length;

  return {
    total: details.length,
    active,
    idle: details.length - active,
    details,
    completed: globalPoller.completedTasks,
    totalTokensToday: globalPoller.totalTokens,
  };
}

export async function getProps(): Promise<Record<string, any>> {
  const res = await fetchWithTimeout(`${LLAMA_URL}/props`);
  return res.json();
}
