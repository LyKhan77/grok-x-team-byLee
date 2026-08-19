'use client';

import { RibbonCard } from '../ui/RibbonCard';
import { SlotsSummary } from '@/lib/types';
import styles from './LiveFeedCard.module.css';

interface LiveFeedCardProps {
  slots: SlotsSummary;
}

export function LiveFeedCard({ slots }: LiveFeedCardProps) {
  const activeSlots = slots.details.filter(s => s.state !== 'idle');

  return (
    <RibbonCard
      title="LIVE STREAM FEED & REQUEST INSPECTOR"
      tint="peach"
    >
      <div className={styles.feedContainer}>
        {activeSlots.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="typo-body-sm">
              [ 0 ACTIVE STREAMS ] Listening for incoming inference requests...
            </span>
          </div>
        ) : (
          <ul className={styles.feedList}>
            {activeSlots.map(slot => {
              const durationSec = ((slot.duration_ms || 0) / 1000).toFixed(1);
              return (
                <li key={slot.id} className={styles.feedItem}>
                  <div className={styles.feedHeader}>
                    <span className="typo-h3">SLOT {slot.id}</span>
                    <span className={`typo-button ${styles.requestType}`}>
                      {slot.request_type || 'Processing'}
                    </span>
                  </div>
                  
                  <div className={styles.feedDetails}>
                    <div className={styles.metric}>
                      <span className="typo-caption">DURATION</span>
                      <span className="typo-body">{durationSec}s</span>
                    </div>
                    <div className={styles.metric}>
                      <span className="typo-caption">TOKENS EMITTED</span>
                      <span className="typo-body">{slot.tokens_generated.toLocaleString()}</span>
                    </div>
                    <div className={styles.metric}>
                      <span className="typo-caption">PROMPT SIZE</span>
                      <span className="typo-body">{(slot.prompt_tokens || 0).toLocaleString()}</span>
                    </div>
                    <div className={styles.metric}>
                      <span className="typo-caption">SPEED</span>
                      <span className="typo-body">{slot.tps.toFixed(1)} TPS</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </RibbonCard>
  );
}
