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

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="text-mute" style={{ marginBottom: '16px' }}>// DETAILED_SLOT_ASSIGNMENTS</div>
      {slots.details.map((slot) => {
        const isActive = slot.state === 'processing';
        return (
          <div 
            key={slot.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px',
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
  );

  return (
    <TuiSection title="ENGINE_SLOTS" modalContent={modalView}>
      <div style={{ marginBottom: '16px', color: 'var(--colors-ink)' }}>
        {">"} Active: <span className="text-accent">{activeCount}</span> / {totalCount}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', gap: '8px' }}>
        {slots.details.map((slot) => {
          const isActive = slot.state === 'processing';
          return (
            <div 
              key={slot.id}
              style={{
                border: isActive ? '1px solid var(--colors-success)' : '1px solid var(--colors-hairline)',
                backgroundColor: isActive ? 'rgba(48,209,88,0.1)' : 'var(--colors-surface-soft)',
                padding: '12px',
                textAlign: 'center',
                borderRadius: 'var(--rounded-sm)'
              }}
            >
              <div style={{ color: isActive ? 'var(--colors-success)' : 'var(--colors-mute)', fontWeight: 'bold' }}>
                S_{slot.id}
              </div>
            </div>
          );
        })}
      </div>
    </TuiSection>
  );
}
