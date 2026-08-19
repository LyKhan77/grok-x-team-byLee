'use client';

import { GpuClusterCard } from '@/components/ribbon-cards/GpuClusterCard';
import { EngineSlotsCard } from '@/components/ribbon-cards/EngineSlotsCard';
import { LiveFeedCard } from '@/components/ribbon-cards/LiveFeedCard';
import { BenchmarkCard } from '@/components/ribbon-cards/BenchmarkCard';
import { ThroughputCard } from '@/components/ribbon-cards/ThroughputCard';
import { useTelemetry } from '@/hooks/useTelemetry';

export default function Home() {
  const { data, loading, error } = useTelemetry();

  if (loading && !data) {
    return (
      <main style={{ padding: '48px', maxWidth: '960px', margin: '0 auto' }}>
        <div className="text-mute">{">"} INITIALIZING SYSTEM...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '48px', maxWidth: '960px', margin: '0 auto' }}>
        <div className="text-danger">{">"} ERROR: {String(error)}</div>
      </main>
    );
  }

  return (
    <main style={{ padding: '64px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'baseline', 
        borderBottom: '1px solid var(--colors-hairline)', 
        paddingBottom: '16px',
        marginBottom: '48px' 
      }}>
        <div>
          <h1 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--colors-ink)' }}>CooperAgent</h1>
          <div className="text-mute" style={{ fontSize: '14px', marginTop: '4px' }}>byLee</div>
        </div>
        <div className="text-success" style={{ fontSize: '14px' }}>[+] SYSTEM_ONLINE</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '64px' }}>
        
        {/* Left Column */}
        <div>
          <ThroughputCard metrics={data?.metrics!} />
          <GpuClusterCard gpus={data?.gpus!} />
          <EngineSlotsCard slots={data?.slots!} />
        </div>

        {/* Right Column */}
        <div>
          <LiveFeedCard slots={data?.slots!} />
          <BenchmarkCard />
        </div>

      </div>
    </main>
  );
}
