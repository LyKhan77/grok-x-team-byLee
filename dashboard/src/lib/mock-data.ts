import { TelemetryData } from './types';

export function getMockTelemetry(): TelemetryData {
  const jitter = () => Math.random() * 4 - 2; // ±2 variance

  return {
    status: 'online',
    uptime_seconds: 14400 + Math.floor(Math.random() * 3600),
    timestamp: new Date().toISOString(),
    gpus: [
      { index: 0, name: 'NVIDIA GeForce RTX 3090', used_mb: 15523 + Math.floor(jitter() * 100), total_mb: 24576, temp_c: 54 + Math.floor(jitter()), util_pct: 42 + Math.floor(jitter() * 5) },
      { index: 1, name: 'NVIDIA GeForce RTX 3090', used_mb: 15391 + Math.floor(jitter() * 100), total_mb: 24576, temp_c: 52 + Math.floor(jitter()), util_pct: 38 + Math.floor(jitter() * 5) },
      { index: 2, name: 'NVIDIA GeForce RTX 3090', used_mb: 14885 + Math.floor(jitter() * 100), total_mb: 24576, temp_c: 49 + Math.floor(jitter()), util_pct: 35 + Math.floor(jitter() * 5) },
    ],
    slots: {
      total: 5,
      active: 2,
      idle: 3,
      details: [
        { id: 0, state: 'processing', tokens_generated: 1420, tps: 24.2 + jitter(), client: 'Dev-1 (192.168.2.55)' },
        { id: 1, state: 'streaming', tokens_generated: 890, tps: 18.5 + jitter(), client: 'Dev-2 (192.168.2.60)' },
        { id: 2, state: 'idle', tokens_generated: 0, tps: 0, client: null },
        { id: 3, state: 'idle', tokens_generated: 0, tps: 0, client: null },
        { id: 4, state: 'idle', tokens_generated: 0, tps: 0, client: null },
      ],
      completed: []
    },
    metrics: {
      current_tps: 42.05 + jitter() * 3,
      avg_ttft_ms: 480.2 + jitter() * 50,
      total_tokens_today: 1284500 + Math.floor(Math.random() * 10000),
      tps_history: Array.from({ length: 30 }, () => 20 + Math.random() * 25),
      ttft_history: Array.from({ length: 30 }, () => 300 + Math.random() * 400),
    },
    model: {
      name: 'Qwen 3.8 / 2.5 27B Q8_0 GGUF',
      context_window: 131072,
      flash_attention: true,
      kv_cache_type: 'q8_0',
      max_output_tokens: 65536,
    },
    is_mock: true,
  };
}
