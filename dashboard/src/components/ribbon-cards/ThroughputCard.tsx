'use client';

import { TuiSection } from '../ui/TuiSection';
import { PerformanceMetrics } from '@/lib/types';

function Sparkline({ data, color }: { data: number[], color: string }) {
  if (!data || data.length === 0) return <div className="text-mute">Awaiting data...</div>;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%', width: '100%' }}>
      {data.map((val, i) => {
        const heightPct = Math.max((val / max) * 100, 2); // min height 2%
        return (
          <div 
            key={i} 
            style={{ 
              width: '100%', 
              height: `${heightPct}%`, 
              backgroundColor: color,
              opacity: val === 0 ? 0.3 : 1
            }} 
          />
        );
      })}
    </div>
  );
}

export function ThroughputCard({ metrics }: { metrics: PerformanceMetrics }) {
  if (!metrics) {
    return (
      <TuiSection title="LIVE_METRICS">
        <div>{">"} Status: <span className="text-warning">WAITING_FOR_DATA_</span></div>
      </TuiSection>
    );
  }

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="text-mute">TPS History (Last 60s)</span>
          <span>Peak: {Math.max(0, ...metrics.tps_history).toFixed(1)}</span>
        </div>
        <div style={{ height: '120px', borderBottom: '1px dashed var(--colors-hairline)' }}>
          <Sparkline data={metrics.tps_history} color="var(--colors-success)" />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="text-mute">TTFT History (Last 60s)</span>
          <span>Avg: {metrics.avg_ttft_ms.toFixed(0)}ms</span>
        </div>
        <div style={{ height: '120px', borderBottom: '1px dashed var(--colors-hairline)' }}>
          <Sparkline data={metrics.ttft_history} color="var(--colors-accent)" />
        </div>
      </div>
    </div>
  );

  return (
    <TuiSection 
      title="LIVE_METRICS" 
      description="Measures real-time tokens per second (TPS) and Time to First Token (TTFT) across the entire cluster. Data is aggregated from all active inference slots."
      modalContent={modalView}
    >
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

        <div style={{ gridColumn: '1 / -1', height: '40px', marginTop: '8px' }}>
           <Sparkline data={metrics.tps_history.slice(-15)} color="var(--colors-success)" />
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
          <div className="text-mute" style={{ marginBottom: '8px' }}>// Total Tokens Emitted</div>
          <div style={{ fontSize: '18px', color: 'var(--colors-ink)' }}>{metrics.total_tokens_today.toLocaleString()} tok</div>
        </div>
      </div>
    </TuiSection>
  );
}
