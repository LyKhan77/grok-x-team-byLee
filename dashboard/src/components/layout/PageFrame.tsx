import styles from './PageFrame.module.css';

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className={styles.frame}>{children}</div>;
}
