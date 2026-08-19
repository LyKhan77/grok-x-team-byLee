import styles from './BevelProgressBar.module.css';

interface BevelProgressBarProps {
  value: number;   // 0-100
  label?: string;
}

export function BevelProgressBar({ value, label }: BevelProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.container}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>
      {label && <span className={`typo-body-sm ${styles.label}`}>{label}</span>}
    </div>
  );
}
