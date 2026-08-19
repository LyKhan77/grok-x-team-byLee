import styles from './TopBanner.module.css';

interface TopBannerProps {
  serverStatus: 'online' | 'offline' | 'degraded';
}

export function TopBanner({ serverStatus }: TopBannerProps) {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.headline}>
          <span className="typo-h2">
            GSPE INTERNAL LLM TELEMETRY &amp; COMPUTE CONTROLLER
          </span>
          <span className={`typo-body-sm ${styles.subtext}`}>
            Enterprise Coding Agent Infrastructure Monitor
          </span>
        </div>
        <div className={styles.rightGroup}>
          <div className={styles.sticker}>
            <span className="typo-button">LIVE TELEMETRY</span>
          </div>
          <div className={styles.phoneCallout}>
            <span className="typo-h2">HOST: 192.168.2.143:8001</span>
            <span
              className={styles.statusDot}
              data-status={serverStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
