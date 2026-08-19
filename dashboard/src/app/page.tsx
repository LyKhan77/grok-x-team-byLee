'use client';

import { PageFrame } from '@/components/layout/PageFrame';
import { TopBanner } from '@/components/layout/TopBanner';
import { LeftRail } from '@/components/layout/LeftRail';
import { FooterBand } from '@/components/layout/FooterBand';
import { GpuClusterCard } from '@/components/ribbon-cards/GpuClusterCard';
import { EngineSlotsCard } from '@/components/ribbon-cards/EngineSlotsCard';
import { ThroughputCard } from '@/components/ribbon-cards/ThroughputCard';
import { useTelemetry } from '@/hooks/useTelemetry';
import styles from './page.module.css';

export default function DashboardPage() {
  const { data, error, loading } = useTelemetry();

  const status = data?.status ?? 'offline';

  return (
    <PageFrame>
      <TopBanner serverStatus={status} />

      <div className={styles.mainLayout}>
        {/* LEFT RAIL (28%) */}
        <div className={styles.leftRail}>
          <LeftRail
            serverStatus={status}
            activeSlots={data?.slots.active ?? 0}
            totalSlots={data?.slots.total ?? 5}
            isMock={data?.is_mock ?? false}
          />
        </div>

        {/* RIGHT MAIN CONTENT (72%) */}
        <main className={styles.rightContent}>
          {loading && !data && (
            <div className={styles.loadingState}>
              <span className="typo-h2">CONNECTING TO INFERENCE SERVER...</span>
            </div>
          )}

          {error && !data && (
            <div className={styles.errorState}>
              <span className="typo-h2">CONNECTION ERROR</span>
              <span className="typo-body">{error}</span>
            </div>
          )}

          {data && (
            <div className={styles.cardStack}>
              {/* Module 1: GPU VRAM Monitor (Periwinkle) */}
              <GpuClusterCard gpus={data.gpus} />

              {/* Module 2: Slot Concurrency & Engine (Steel) */}
              <EngineSlotsCard slots={data.slots} model={data.model} />

              {/* Module 4: Throughput & Latency (Lime) */}
              <ThroughputCard metrics={data.metrics} />
            </div>
          )}
        </main>
      </div>

      <FooterBand />
    </PageFrame>
  );
}
