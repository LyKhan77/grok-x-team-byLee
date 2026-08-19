'use client';

import { TuiSection } from '../ui/TuiSection';
import { GpuInfo } from '@/lib/types';

export function GpuClusterCard({ gpus }: { gpus: GpuInfo[] }) {
  if (!gpus || gpus.length === 0) {
    return (
      <TuiSection title="GPU_CLUSTER">
        <div>{">"} Status: <span className="text-warning">WAITING_FOR_DATA_</span></div>
      </TuiSection>
    );
  }

  return (
    <TuiSection title="GPU_CLUSTER">
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
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '16px',
                padding: '12px',
                border: '1px solid var(--colors-hairline)',
                borderRadius: 'var(--rounded-sm)',
                backgroundColor: 'var(--colors-surface-soft)'
              }}
            >
              <div>[{gpu.index}]</div>
              <div>
                <div style={{ color: 'var(--colors-ink)', fontWeight: 500 }}>{gpu.name}</div>
                <div>{">"} VRAM: {gpu.used_mb}MB / {gpu.total_mb}MB <span className={colorClass}>({vram_percent}%)</span></div>
                <div>{">"} TEMP: {gpu.temp_c}C | UTIL: {gpu.util_pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </TuiSection>
  );
}
