export interface GpuInfo {
  index: number;
  name: string;
  used_mb: number;
  total_mb: number;
  temp_c: number;
  util_pct: number;
}

export interface SlotDetail {
  id: number;
  state: 'idle' | 'processing' | 'streaming';
  tokens_generated: number;
  tps: number;
  client: string | null;
  duration_ms?: number;
  request_type?: string;
  prompt_tokens?: number;
}

export interface SlotsSummary {
  total: number;
  active: number;
  idle: number;
  details: SlotDetail[];
}

export interface PerformanceMetrics {
  current_tps: number;
  avg_ttft_ms: number;
  total_tokens_today: number;
  tps_history: number[];      // last 30 data points (1 min of 2s polls)
  ttft_history: number[];     // last 30 data points
}

export interface TelemetryData {
  status: 'online' | 'offline' | 'degraded';
  uptime_seconds: number;
  timestamp: string;
  gpus: GpuInfo[];
  slots: SlotsSummary;
  metrics: PerformanceMetrics;
  model: {
    name: string;
    context_window: number;
    flash_attention: boolean;
    kv_cache_type: string;
    max_output_tokens: number;
  };
  is_mock: boolean;
}
