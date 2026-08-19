'use client';

import { RibbonCard } from '../ui/RibbonCard';
import { StickerBadge } from '../ui/StickerBadge';
import { SlotsSummary } from '@/lib/types';
import styles from './EngineSlotsCard.module.css';

interface EngineSlotsCardProps {
  slots: SlotsSummary;
  model: {
    name: string;
    context_window: number;
    flash_attention: boolean;
    kv_cache_type: string;
    max_output_tokens: number;
  };
}

export function EngineSlotsCard({ slots, model }: EngineSlotsCardProps) {
  return (
    <RibbonCard
      title="INFERENCE ENGINE CONTROLLER"
      tint="steel"
    >
      {/* Model Spec Row */}
      <div className={styles.specRow}>
        <table className={styles.specTable}>
          <tbody>
            <tr>
              <td className="typo-h3">MODEL</td>
              <td className="typo-body">{model.name}</td>
            </tr>
            <tr>
              <td className="typo-h3">CONTEXT</td>
              <td className="typo-body">{model.context_window.toLocaleString()} Tokens ({Math.floor(model.context_window / 1024)}K)</td>
            </tr>
            <tr>
              <td className="typo-h3">FLASH ATTN</td>
              <td className="typo-body">{model.flash_attention ? 'ON (-fa)' : 'OFF'}</td>
            </tr>
            <tr>
              <td className="typo-h3">KV-CACHE</td>
              <td className="typo-body">{model.kv_cache_type.toUpperCase()}</td>
            </tr>
            <tr>
              <td className="typo-h3">MAX OUTPUT</td>
              <td className="typo-body">{model.max_output_tokens.toLocaleString()} Tokens ({Math.floor(model.max_output_tokens / 1024)}K)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Slot Status Grid */}
      <div className={styles.slotGrid}>
        <div className={styles.slotSummary}>
          <span className="typo-h3">PARALLEL SLOTS</span>
          <span className="typo-body">
            {slots.active} ACTIVE / {slots.idle} IDLE / {slots.total} TOTAL
          </span>
        </div>
        <table className={styles.slotTable}>
          <thead>
            <tr>
              <th className="typo-h3">SLOT</th>
              <th className="typo-h3">STATE</th>
              <th className="typo-h3">TOKENS</th>
              <th className="typo-h3">TPS</th>
              <th className="typo-h3">CLIENT</th>
            </tr>
          </thead>
          <tbody>
            {slots.details.map((slot) => (
              <tr key={slot.id}>
                <td className="typo-body">Slot {slot.id}</td>
                <td>
                  <StickerBadge text={slot.state.toUpperCase()} />
                </td>
                <td className="typo-body">{slot.tokens_generated.toLocaleString()}</td>
                <td className="typo-body">{slot.tps.toFixed(1)}</td>
                <td className="typo-body">{slot.client ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RibbonCard>
  );
}
