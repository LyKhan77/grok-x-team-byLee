'use client';

import { TuiSection } from '../ui/TuiSection';
import { GpuInfo } from '@/lib/types';

function AsciiBar({ percent, width = 20 }: { percent: number, width?: number }) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return (
    <span style={{ letterSpacing: '2px' }}>
      {Array(filled).fill('█').join('')}
      <span style={{ opacity: 0.3 }}>{Array(empty).fill('░').join('')}</span>
    </span>
  );
}

export function GpuClusterCard({ gpus }: { gpus: GpuInfo[] }) {
  if (!gpus || gpus.length === 0) {
    return (
      <TuiSection title="GPU_CLUSTER">
        <div>{">"} Status: <span className="text-warning">WAITING_FOR_DATA_</span></div>
      </TuiSection>
    );
  }

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="text-mute" style={{ marginBottom: '8px' }}>// DETAILED_VRAM_ALLOCATION</div>
      {gpus.map((gpu) => {
        const vram_percent = Math.round((gpu.used_mb / gpu.total_mb) * 100);
        const isWarning = vram_percent > 85;
        const isDanger = vram_percent > 95;
        const colorClass = isDanger ? 'text-danger' : isWarning ? 'text-warning' : 'text-success';

        return (
          <div key={gpu.index} style={{ border: '1px solid var(--colors-hairline)', padding: '16px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>[{gpu.index}] {gpu.name}</span>
              <span className={colorClass}>{gpu.used_mb}MB / {gpu.total_mb}MB ({vram_percent}%)</span>
            </div>
            <div className={colorClass} style={{ fontSize: '18px' }}>
              <AsciiBar percent={vram_percent} width={40} />
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '16px', color: 'var(--colors-body)' }}>
              <div>{">"} TEMP: {gpu.temp_c}°C</div>
              <div>{">"} UTIL: {gpu.util_pct}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <TuiSection title="GPU_CLUSTER" modalContent={modalView}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gpus.map((gpu) => {
          const vram_percent = Math.round((gpu.used_mb / gpu.total_mb) * 100);
          const isWarning = vram_percent > 85;
          const isDanger = vram_percent > 95;
          let colorClass = 'text-success';
          if (isWarning) colorClass = 'text-warning';
          if (isDanger) colorClass = 'text-danger';

          return (
            <div 
              key={gpu.index} 
              style={{
                padding: '12px',
                border: '1px solid var(--colors-hairline)',
                borderRadius: 'var(--rounded-sm)',
                backgroundColor: 'var(--colors-surface-soft)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>[{gpu.index}] <span style={{ color: 'var(--colors-ink)', fontWeight: 500 }}>{gpu.name}</span></div>
                <div className={colorClass}>{vram_percent}%</div>
              </div>
              <div className={colorClass} style={{ fontSize: '12px', overflow: 'hidden' }}>
                <AsciiBar percent={vram_percent} width={30} />
              </div>
            </div>
          );
        })}
      </div>
    </TuiSection>
  );
}
