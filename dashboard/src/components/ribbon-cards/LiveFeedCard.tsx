'use client';

import { TuiSection } from '../ui/TuiSection';
import { SlotsSummary, CompletedTask } from '@/lib/types';

export function LiveFeedCard({ slots }: { slots: SlotsSummary }) {
  if (!slots || !slots.details) return null;

  const activeSlots = slots.details.filter(s => s.state === 'processing');
  const completedTasks = slots.completed || [];

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  };

  const formatDuration = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's';
  };

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* SECTION: ACTIVE STREAMS */}
      <div>
        <div className="text-mute" style={{ marginBottom: '8px' }}>// ACTIVE_STREAMS ({activeSlots.length})</div>
        {activeSlots.length === 0 ? (
          <div className="text-mute" style={{ paddingLeft: '8px' }}>{">"} System is idle.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeSlots.map(slot => (
              <div key={slot.id} style={{ borderLeft: '2px solid var(--colors-accent)', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-accent">{slot.client}</span>
                  <span className="text-mute">[{slot.duration_ms}ms]</span>
                </div>
                <div style={{ color: 'var(--colors-ink)' }}>Type: {slot.request_type}</div>
                <div style={{ color: 'var(--colors-ink)' }}>Tokens: {slot.tokens_generated} / {slot.prompt_tokens} (prompt)</div>
                <div style={{ color: 'var(--colors-ink)' }}>Speed: <span className="text-success">{slot.tps.toFixed(1)} tok/s</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: SESSION HISTORY (COMPLETED TASKS) */}
      <div>
        <div className="text-mute" style={{ marginBottom: '8px', borderTop: '1px dashed var(--colors-hairline)', paddingTop: '16px' }}>
          // COMPLETED_SESSIONS_HISTORY
        </div>
        {completedTasks.length === 0 ? (
          <div className="text-mute" style={{ paddingLeft: '8px' }}>{">"} No recent history.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--colors-hairline)', color: 'var(--colors-mute)', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>TIME</th>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>CLIENT (TASK)</th>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>TYPE</th>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>DURATION</th>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>GEN</th>
                <th style={{ padding: '8px 4px', fontWeight: 'normal' }}>SPEED</th>
              </tr>
            </thead>
            <tbody>
              {completedTasks.map((task, idx) => (
                <tr key={`${task.task_id}-${idx}`} style={{ borderBottom: '1px dashed var(--colors-hairline)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-mute)' }}>{formatTime(task.timestamp)}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-accent)' }}>{task.client}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-ink)' }}>{task.request_type}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-ink)' }}>{formatDuration(task.duration_ms)}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-ink)' }}>{task.tokens_generated}</td>
                  <td style={{ padding: '8px 4px', color: 'var(--colors-success)' }}>{task.tps.toFixed(1)} t/s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <TuiSection 
      title="LIVE_FEED & HISTORY" 
      description="Real-time telemetry of active streams and chronological history of completed sessions."
      modalContent={modalView}
    >
      <div style={{ 
        border: '1px solid var(--colors-hairline)',
        backgroundColor: 'var(--colors-surface-soft)',
        borderRadius: 'var(--rounded-sm)',
        padding: '16px',
        minHeight: '150px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {activeSlots.length > 0 ? (
          <>
            <div className="text-mute" style={{ fontSize: '12px', marginBottom: '-8px' }}>// ACTIVE</div>
            {activeSlots.slice(0, 2).map(slot => (
              <div key={slot.id} style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-accent">{slot.client}</span>
                  <span className="text-mute">[{slot.duration_ms}ms]</span>
                </div>
                <div style={{ color: 'var(--colors-ink)' }}>{">"} Type: {slot.request_type}</div>
              </div>
            ))}
            {activeSlots.length > 2 && (
              <div className="text-accent" style={{ fontSize: '12px', textAlign: 'center' }}>
                + {activeSlots.length - 2} MORE (Click [EXPAND_])
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-mute">{">"} Awaiting incoming requests_</div>
            {completedTasks.length > 0 && (
              <div style={{ marginTop: 'auto', borderTop: '1px dashed var(--colors-hairline)', paddingTop: '12px' }}>
                <div className="text-mute" style={{ fontSize: '12px', marginBottom: '4px' }}>// LAST_COMPLETED</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span className="text-ink">{completedTasks[0].client}</span>
                  <span className="text-success">{completedTasks[0].tokens_generated} tok @ {completedTasks[0].tps.toFixed(1)} t/s</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TuiSection>
  );
}
