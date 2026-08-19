import styles from './LeftRail.module.css';
import { RedAlertPanel } from '../ui/RedAlertPanel';

interface LeftRailProps {
  serverStatus: 'online' | 'offline' | 'degraded';
  activeSlots: number;
  totalSlots: number;
  isMock: boolean;
}

export function LeftRail({ serverStatus, activeSlots, totalSlots, isMock }: LeftRailProps) {
  return (
    <aside className={styles.rail}>
      <RedAlertPanel
        status={serverStatus}
        activeSlots={activeSlots}
        totalSlots={totalSlots}
        isMock={isMock}
      />

      {/* Nav Icon Grid — adapted Dell's 2x4 icon grid */}
      <nav className={styles.navGrid}>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>📊</span>
          <span className="typo-ui-label">METRICS</span>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>🖥️</span>
          <span className="typo-ui-label">GPU INFO</span>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>⚡</span>
          <span className="typo-ui-label">ENGINE</span>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>🔧</span>
          <span className="typo-ui-label">CONFIG</span>
        </div>
      </nav>

      {/* Active Sessions Summary */}
      <div className={styles.sessionsSummary}>
        <span className="typo-h3">ACTIVE SESSIONS</span>
        <div className={styles.sessionCount}>
          <span className={styles.bigNumber}>{activeSlots}</span>
          <span className="typo-body"> / {totalSlots} slots</span>
        </div>
      </div>
    </aside>
  );
}
