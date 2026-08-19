'use client';

import { RibbonCard } from '../ui/RibbonCard';
import { BevelProgressBar } from '../ui/BevelProgressBar';
import { StickerBadge } from '../ui/StickerBadge';
import { GpuInfo } from '@/lib/types';
import styles from './GpuClusterCard.module.css';

interface GpuClusterCardProps {
  gpus: GpuInfo[];
}

export function GpuClusterCard({ gpus }: GpuClusterCardProps) {
  return (
    <RibbonCard
      title="3x NVIDIA GeForce RTX 3090 — VRAM CLUSTER STATUS"
      tint="periwinkle"
      eyebrow="GPU COMPUTE CLUSTER"
    >
      <div className={styles.gpuGrid}>
        {gpus.map((gpu) => {
          const usedPct = (gpu.used_mb / gpu.total_mb) * 100;
          const freeMb = gpu.total_mb - gpu.used_mb;
          return (
            <div key={gpu.index} className={styles.gpuPanel}>
              <div className={styles.gpuHeader}>
                <span className="typo-h3">GPU {gpu.index}</span>
                <StickerBadge text={`${gpu.temp_c}°C`} />
              </div>
              <div className={styles.gpuMetrics}>
                <BevelProgressBar
                  value={usedPct}
                  label={`${usedPct.toFixed(1)}%`}
                />
                <span className="typo-body">
                  {gpu.used_mb.toLocaleString()} MB / {gpu.total_mb.toLocaleString()} MB
                </span>
                <span className="typo-body-sm">
                  ~{freeMb.toLocaleString()} MB Free
                </span>
                <span className="typo-body-sm">
                  Compute: {gpu.util_pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </RibbonCard>
  );
}
