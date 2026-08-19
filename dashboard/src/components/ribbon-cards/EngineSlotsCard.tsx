'use client';

import { TuiSection } from '../ui/TuiSection';
import { SlotsSummary } from '@/lib/types';

export function EngineSlotsCard({ slots }: { slots: SlotsSummary }) {
  if (!slots || !slots.details) {
    return (
      <TuiSection title="ENGINE_SLOTS">
        <div>{">"} Status: <span className="text-warning">WAITING_FOR_DATA_</span></div>
      </TuiSection>
    );
  }

  const activeCount = slots.active;
  const totalCount = slots.total;

  return (
    <TuiSection title="ENGINE_SLOTS">
      <div style={{ marginBottom: '16px', color: 'var(--colors-ink)' }}>
        {">"} Active: <span className="text-accent">{activeCount}</span> / {totalCount}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {slots.details.map((slot) => {
          const isActive = slot.state === 'processing';
          return (
            <div 
              key={slot.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                border: '1px solid var(--colors-hairline)',
                borderRadius: 'var(--rounded-sm)',
                backgroundColor: 'var(--colors-surface-soft)',
                color: isActive ? 'var(--colors-ink)' : 'var(--colors-mute)'
              }}
            >
              <div>{">"} Slot {slot.id}: {isActive ? <span className="text-success">ACTIVE</span> : 'IDLE'}</div>
              <div>{isActive ? slot.client : '-'}</div>
            </div>
          );
        })}
      </div>
    </TuiSection>
  );
}
