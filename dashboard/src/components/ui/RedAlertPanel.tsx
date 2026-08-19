import styles from './RedAlertPanel.module.css';

interface RedAlertPanelProps {
  status: 'online' | 'offline' | 'degraded';
  activeSlots: number;
  totalSlots: number;
  isMock: boolean;
}

export function RedAlertPanel({ status, activeSlots, totalSlots, isMock }: RedAlertPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={`typo-body ${styles.copy}`}>
        {status === 'online'
          ? `Inference server is ONLINE and serving ${activeSlots} of ${totalSlots} concurrent developer streams. All 3x RTX 3090 GPUs operational.`
          : status === 'degraded'
          ? `Server is DEGRADED — partial functionality available. ${activeSlots} active streams.`
          : 'Server is OFFLINE — all inference slots unavailable. Check server-optimize.sh status.'}
      </p>
      {isMock && (
        <p className={`typo-body-sm ${styles.mockBadge}`}>
          ⚠ MOCK DATA — Server tidak terdeteksi
        </p>
      )}
    </div>
  );
}
