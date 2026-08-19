import { ReactNode } from 'react';

interface TuiSectionProps {
  title: string;
  children: ReactNode;
}

export function TuiSection({ title, children }: TuiSectionProps) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 
        style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          marginBottom: '16px',
          borderBottom: '1px solid var(--colors-hairline)',
          paddingBottom: '8px',
          color: 'var(--colors-ink)'
        }}
      >
        [+] {title}
      </h2>
      <div style={{ color: 'var(--colors-body)' }}>
        {children}
      </div>
    </section>
  );
}
