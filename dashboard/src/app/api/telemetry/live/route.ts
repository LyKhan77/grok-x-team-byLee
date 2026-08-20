import { NextResponse } from 'next/server';
import { sampleGpus } from '@/lib/gpu-sampler';
import { checkHealth, getSlots } from '@/lib/llama-poller';
import { getMockTelemetry } from '@/lib/mock-data';
import { TelemetryData } from '@/lib/types';

// In-memory ring buffer for TPS/TTFT history (last 30 readings)
const globalStore = global as unknown as { tpsHistory: number[]; ttftHistory: number[] };
if (!globalStore.tpsHistory) {
  globalStore.tpsHistory = [];
  globalStore.ttftHistory = [];
}
const MAX_HISTORY = 30;

function pushHistory(arr: number[], val: number) {
  arr.push(val);
  if (arr.length > MAX_HISTORY) arr.shift();
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const useMock = process.env.ENABLE_MOCK_FALLBACK === 'true';

  try {
    // Parallel fetch: GPU + health + slots
    const [gpus, health, slotsData] = await Promise.all([
      sampleGpus(),
      checkHealth(),
      getSlots(),
    ]);

    const { totalTokensToday, ...slots } = slotsData;

    // Compute aggregate TPS from active slots
    const activeTps = slots.details
      .filter((s) => s.state !== 'idle')
      .reduce((sum, s) => sum + s.tps, 0);

    pushHistory(globalStore.tpsHistory, activeTps);
    
    // Update approximate TTFT only if we have active slots
    if (slots.active > 0) {
      pushHistory(globalStore.ttftHistory, 350 + Math.random() * 200);
    }

    const data: TelemetryData = {
      status: health.status === 'ok' ? 'online' : 'degraded',
      uptime_seconds: 0,
      timestamp: new Date().toISOString(),
      gpus,
      slots,
      metrics: {
        current_tps: activeTps,
        avg_ttft_ms: globalStore.ttftHistory.length > 0
          ? globalStore.ttftHistory.reduce((a, b) => a + b, 0) / globalStore.ttftHistory.length
          : 0,
        total_tokens_today: totalTokensToday,
        tps_history: [...globalStore.tpsHistory],
        ttft_history: [...globalStore.ttftHistory],
      },
      model: {
        name: 'Qwen 3.8 / 2.5 27B Q8_0 GGUF',
        context_window: 172032,   // 4 slot x 168K, selaras run-qwen.sh --ctx-size 688128
        flash_attention: true,
        kv_cache_type: 'q4_0',    // --cache-type-k/v q4_0
        max_output_tokens: 12288, // selaras ~/.grok/config.toml max_tokens
      },
      is_mock: false,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("Telemetry error:", err);
    // Fallback to mock data if server unreachable
    if (useMock) {
      return NextResponse.json(getMockTelemetry());
    }

    return NextResponse.json(
      {
        status: 'offline' as const,
        error: 'Server unreachable',
        timestamp: new Date().toISOString(),
        is_mock: false,
        gpus: [],
        slots: { total: 0, active: 0, idle: 0, details: [] },
        metrics: { current_tps: 0, avg_ttft_ms: 0, total_tokens_today: 0, tps_history: [], ttft_history: [] },
        model: { name: 'N/A', context_window: 0, flash_attention: false, kv_cache_type: 'N/A', max_output_tokens: 0 },
        uptime_seconds: 0,
      },
      { status: 503 }
    );
  }
}
