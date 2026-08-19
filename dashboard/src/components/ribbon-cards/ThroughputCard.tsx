'use client';

import { TuiSection } from '../ui/TuiSection';
import { PerformanceMetrics } from '@/lib/types';

export function ThroughputCard({ metrics }: { metrics: PerformanceMetrics }) {
  if (!metrics) {
    return (
      <TuiSection title="LIVE_METRICS">
        <div>{">"} Status: <span className="text-warning">WAITING_FOR_DATA_</span></div>
      </TuiSection>
    );
  }

  return (
    <TuiSection title="LIVE_METRICS">
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'var(--colors-surface-card)',
          borderRadius: 'var(--rounded-sm)',
          border: '1px solid var(--colors-hairline)'
        }}
      >
        <div>
          <div className="text-mute" style={{ marginBottom: '8px' }}>// Throughput (TPS)</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--colors-success)' }}>
            {metrics.current_tps.toFixed(2)}
          </div>
        </div>
        
        <div>
          <div className="text-mute" style={{ marginBottom: '8px' }}>// Avg TTFT (ms)</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--colors-accent)' }}>
            {metrics.avg_ttft_ms > 0 ? metrics.avg_ttft_ms.toFixed(0) : '-'}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
          <div className="text-mute" style={{ marginBottom: '8px' }}>// Total Tokens Emitted</div>
          <div style={{ fontSize: '18px', color: 'var(--colors-ink)' }}>{metrics.total_tokens_today.toLocaleString()} tok</div>
        </div>
      </div>
    </TuiSection>
  );
}
