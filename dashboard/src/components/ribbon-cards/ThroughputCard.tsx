'use client';

import { RibbonCard } from '../ui/RibbonCard';
import { PerformanceMetrics } from '@/lib/types';
import styles from './ThroughputCard.module.css';

interface ThroughputCardProps {
  metrics: PerformanceMetrics;
}

export function ThroughputCard({ metrics }: ThroughputCardProps) {
  const maxTps = Math.max(...metrics.tps_history, 1);

  return (
    <RibbonCard
      title="REAL-TIME LATENCY & THROUGHPUT METER"
      tint="lime"
    >
      {/* Big Numbers Row */}
      <div className={styles.metricsRow}>
        <div className={styles.metric}>
          <span className="typo-display">{metrics.current_tps.toFixed(1)}</span>
          <span className="typo-h3">TOKENS/SEC (TPS)</span>
        </div>
        <div className={styles.metric}>
          <span className="typo-display">{metrics.avg_ttft_ms.toFixed(0)}</span>
          <span className="typo-h3">AVG TTFT (MS)</span>
        </div>
        <div className={styles.metric}>
          <span className="typo-h1">{metrics.total_tokens_today.toLocaleString()}</span>
          <span className="typo-h3">TOKENS TODAY</span>
        </div>
      </div>

      {/* TPS History Bar Chart — last 30 readings (1 minute at 2s interval) */}
      <div className={styles.chartSection}>
        <span className="typo-h3">THROUGHPUT HISTORY (LAST 60 SECONDS)</span>
        <div className={styles.barChart}>
          {metrics.tps_history.map((tps, i) => (
            <div
              key={i}
              className={styles.bar}
              style={{ height: `${(tps / maxTps) * 100}%` }}
              title={`${tps.toFixed(1)} TPS`}
            />
          ))}
        </div>
      </div>
    </RibbonCard>
  );
}
