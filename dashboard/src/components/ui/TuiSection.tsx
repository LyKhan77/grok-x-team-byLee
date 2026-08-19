'use client';

import { ReactNode, useState } from 'react';

interface TuiSectionProps {
  title: string;
  children: ReactNode;
  modalContent?: ReactNode;
}

export function TuiSection({ title, children, modalContent }: TuiSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section style={{ marginBottom: '48px' }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid var(--colors-hairline)',
            paddingBottom: '8px',
            marginBottom: '16px',
            cursor: modalContent ? 'pointer' : 'default'
          }}
          onClick={() => modalContent && setIsModalOpen(true)}
        >
          <h2 
            style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: 'var(--colors-ink)'
            }}
          >
            [+] {title}
          </h2>
          {modalContent && (
            <span style={{ fontSize: '12px', color: 'var(--colors-accent)', cursor: 'pointer' }}>
              [↗] EXPAND_
            </span>
          )}
        </div>
        <div style={{ color: 'var(--colors-body)' }}>
          {children}
        </div>
      </section>

      {isModalOpen && modalContent && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--colors-canvas)',
              border: '1px solid var(--colors-hairline)',
              borderRadius: 'var(--rounded-sm)',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--colors-canvas)',
              borderBottom: '1px solid var(--colors-hairline)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--colors-ink)' }}>
                [+] {title} (DETAILED_VIEW)
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--colors-danger)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px'
                }}
              >
                [x] CLOSE_
              </button>
            </div>
            <div style={{ padding: '24px', color: 'var(--colors-ink)' }}>
              {modalContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
