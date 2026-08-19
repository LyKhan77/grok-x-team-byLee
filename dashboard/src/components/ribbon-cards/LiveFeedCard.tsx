'use client';

import { TuiSection } from '../ui/TuiSection';
import { SlotsSummary } from '@/lib/types';

export function LiveFeedCard({ slots }: { slots: SlotsSummary }) {
  if (!slots || !slots.details) return null;

  const activeSlots = slots.details.filter(s => s.state === 'processing');

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="text-mute" style={{ marginBottom: '8px' }}>// ALL_ACTIVE_STREAMS</div>
      {activeSlots.length === 0 ? (
        <div className="text-mute">{">"} No active streams...</div>
      ) : (
        activeSlots.map(slot => (
          <div key={slot.id} style={{ border: '1px solid var(--colors-hairline)', padding: '16px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="text-accent">{slot.client}</span>
              <span className="text-mute">[{slot.duration_ms}ms]</span>
            </div>
            <div style={{ color: 'var(--colors-ink)' }}>{">"} Type: {slot.request_type}</div>
            <div style={{ color: 'var(--colors-ink)' }}>{">"} Tokens: {slot.tokens_generated} generated / {slot.prompt_tokens} prompt</div>
            <div style={{ color: 'var(--colors-ink)' }}>{">"} Speed: <span className="text-success">{slot.tps.toFixed(1)} tok/s</span></div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <TuiSection 
      title="LIVE_FEED" 
      description="Real-time telemetry of active inference streams, displaying request classification, generated tokens, and generation speed (tok/s)."
      modalContent={modalView}
    >
      <div style={{ 
        border: '1px solid var(--colors-hairline)',
        backgroundColor: 'var(--colors-surface-soft)',
        borderRadius: 'var(--rounded-sm)',
        padding: '16px',
        minHeight: '150px'
      }}>
        {activeSlots.length === 0 ? (
          <div className="text-mute">{">"} Awaiting incoming requests_</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeSlots.slice(0, 2).map(slot => (
              <div key={slot.id} style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-accent">{slot.client}</span>
                  <span className="text-mute">[{slot.duration_ms}ms]</span>
                </div>
                <div style={{ color: 'var(--colors-ink)' }}>
                  {">"} Type: {slot.request_type}
                </div>
                <div style={{ color: 'var(--colors-ink)' }}>
                  {">"} Tokens: {slot.tokens_generated} generated
                </div>
              </div>
            ))}
            {activeSlots.length > 2 && (
              <div className="text-accent" style={{ fontSize: '12px', textAlign: 'center' }}>
                + {activeSlots.length - 2} MORE (Click [EXPAND_] to view)
              </div>
            )}
          </div>
        )}
      </div>
    </TuiSection>
  );
}
