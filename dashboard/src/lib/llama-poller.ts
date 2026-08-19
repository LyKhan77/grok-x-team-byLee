import { SlotsSummary, SlotDetail, CompletedTask } from './types';
import fs from 'fs';
import path from 'path';
import os from 'os';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';
const TIMEOUT_MS = 3000;

// Global persistent state across Next.js dev reloads
const globalPoller = global as unknown as {
  slotStates: Map<number, { timestamp: number; startTimestamp: number; n_decoded: number; clientIp?: string }>;
  totalTokens: number;
  completedTasks: CompletedTask[];
};

if (!globalPoller.slotStates) {
  globalPoller.slotStates = new Map();
  globalPoller.totalTokens = 0;
  globalPoller.completedTasks = [];
}

const getClientsFile = () => path.join(os.tmpdir(), 'gspexgrok_active_clients.json');

export function registerClientIp(clientIdentifier: string) {
  try {
    const file = getClientsFile();
    let clients: { client: string; timestamp: number }[] = [];
    if (fs.existsSync(file)) {
      try {
        clients = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        clients = [];
      }
    }
    // Prepend latest client
    clients.unshift({ client: clientIdentifier, timestamp: Date.now() });
    // Keep last 30 requests
    if (clients.length > 30) clients = clients.slice(0, 30);
    fs.writeFileSync(file, JSON.stringify(clients));
  } catch (e) {
    console.error('Failed to register client:', e);
  }
}

function getLatestClient(slotIndex: number): string {
  try {
    const file = getClientsFile();
    if (fs.existsSync(file)) {
      const clients: { client: string; timestamp: number }[] = JSON.parse(fs.readFileSync(file, 'utf8'));
      const now = Date.now();
      // Look for any request registered in the last 15 minutes (long-task friendly)
      const valid = clients.filter(c => now - c.timestamp < 15 * 60 * 1000);
      if (valid.length > 0) {
        // Pick client based on slot index or latest
        const picked = valid[slotIndex % valid.length];
        return picked ? picked.client : valid[0].client;
      }
    }
  } catch (e) {}
  return 'Direct/Unknown';
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

    // Extract n_decoded
    let n_decoded = slot.n_decoded ?? slot.tokens_predicted ?? 0;
    if (slot.next_token && Array.isArray(slot.next_token) && slot.next_token.length > 0) {
      n_decoded = slot.next_token[0].n_decoded ?? n_decoded;
    }

    let tps = 0;
    let duration_ms = 0;
    let clientIp = 'Unknown';
    const prevState = globalPoller.slotStates.get(id);

    if (isProcessing) {
      let startTimestamp = now;
      if (prevState) {
        startTimestamp = prevState.startTimestamp;
        clientIp = prevState.clientIp && prevState.clientIp !== 'Direct/Unknown' 
          ? prevState.clientIp 
          : getLatestClient(id);
        
        const deltaTokens = n_decoded - prevState.n_decoded;
        const deltaMs = now - prevState.timestamp;
        
        if (deltaMs > 0 && deltaTokens > 0) {
          tps = deltaTokens / (deltaMs / 1000);
          globalPoller.totalTokens += deltaTokens;
        } else if (deltaTokens < 0) {
          globalPoller.totalTokens += n_decoded;
          startTimestamp = now;
          clientIp = getLatestClient(id);
        }
      } else {
        globalPoller.totalTokens += n_decoded;
        clientIp = getLatestClient(id);
      }
      
      duration_ms = now - startTimestamp;
      if (tps > 200) tps = 0;

      globalPoller.slotStates.set(id, { timestamp: now, startTimestamp, n_decoded, clientIp });
    } else {
      // Idle
      if (prevState) {
        const finalTps = prevState.n_decoded / Math.max((now - prevState.startTimestamp) / 1000, 1);
        const resolvedClient = prevState.clientIp && prevState.clientIp !== 'Direct/Unknown'
          ? prevState.clientIp
          : getLatestClient(id);

        globalPoller.completedTasks.unshift({
          task_id: slot.id_task ? String(slot.id_task) : '?',
          client: resolvedClient,
          timestamp: now,
          duration_ms: now - prevState.startTimestamp,
          tokens_generated: prevState.n_decoded,
          prompt_tokens: prompt_tokens,
          tps: finalTps,
          request_type: request_type
        });

        if (globalPoller.completedTasks.length > 50) {
          globalPoller.completedTasks.pop();
        }
      }
      globalPoller.slotStates.delete(id);
    }

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
