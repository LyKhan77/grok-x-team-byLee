import styles from './StickerBadge.module.css';

interface StickerBadgeProps {
  text: string;
  variant?: 'default' | 'rotated';
}

export function StickerBadge({ text, variant = 'default' }: StickerBadgeProps) {
  return (
    <span className={`${styles.sticker} ${variant === 'rotated' ? styles.rotated : ''} typo-button`}>
      {text}
    </span>
  );
}
