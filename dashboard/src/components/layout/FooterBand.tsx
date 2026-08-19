import styles from './FooterBand.module.css';

export function FooterBand() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.iconNav}>
        <a className={styles.navLink} href="#">
          <span className={styles.icon}>🔍</span>
          <span className="typo-ui-label">FIND</span>
        </a>
        <a className={styles.navLink} href="#">
          <span className={styles.icon}>🏠</span>
          <span className="typo-ui-label">HOME</span>
        </a>
        <a className={styles.navLink} href="#">
          <span className={styles.icon}>📊</span>
          <span className="typo-ui-label">METRICS</span>
        </a>
        <a className={styles.navLink} href="#">
          <span className={styles.icon}>🔧</span>
          <span className="typo-ui-label">SUPPORT</span>
        </a>
      </nav>

      <div className={styles.legalRow}>
        <a href="#" className="typo-body-sm">Copyright</a>
        <span className="typo-body-sm"> · </span>
        <span className="typo-body-sm">(Terms of Use)</span>
      </div>

      <p className="typo-caption">
        © 2026 GSPE Internal AI Platform Team. All rights reserved.
        This dashboard is best viewed with modern browser versions.
      </p>
    </footer>
  );
}
