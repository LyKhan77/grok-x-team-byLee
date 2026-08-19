import styles from './RibbonCard.module.css';

type TintColor =
  | 'periwinkle' | 'steel' | 'salmon'
  | 'lime' | 'peach' | 'sage'
  | 'olive' | 'sky';

interface RibbonCardProps {
  title: string;
  tint: TintColor;
  eyebrow?: string;
  children: React.ReactNode;
}

export function RibbonCard({ title, tint, eyebrow, children }: RibbonCardProps) {
  return (
    <div className={styles.card}>
      {eyebrow && (
        <div className={`${styles.eyebrow} ${styles[`eyebrow_${tint}`]}`}>
          <span className="typo-display">{eyebrow}</span>
        </div>
      )}
      <div className={styles.titleBar}>
        <span className="typo-h3">{title}</span>
      </div>
      <div className={`${styles.body} ${styles[`body_${tint}`]}`}>
        {children}
      </div>
    </div>
  );
}
