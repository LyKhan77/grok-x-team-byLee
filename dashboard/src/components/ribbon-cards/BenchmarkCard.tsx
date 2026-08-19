'use client';

import { useState, useEffect } from 'react';
import { TuiSection } from '../ui/TuiSection';

export function BenchmarkCard() {
  const [report, setReport] = useState<string>('Loading archive...');
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState('');

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/benchmark');
      const data = await res.json();
      setReport(data.content || 'Error reading content');
    } catch {
      setReport('Failed to load benchmark archive.');
    }
  };

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunTest = async () => {
    if (!confirm('WARNING: Triggering the stress test will generate heavy load. Are you sure?')) {
      return;
    }

    setIsRunning(true);
    setMessage('> INITIATING STRESS TEST...');

    try {
      const res = await fetch('/api/benchmark', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`> ${data.message}`);
      } else {
        setMessage(`> Error: ${data.error}`);
        setIsRunning(false);
      }
    } catch {
      setMessage('> Failed to reach server.');
      setIsRunning(false);
    }
    
    setTimeout(() => {
      setIsRunning(false);
      setMessage('');
      fetchReport();
    }, 120000);
  };

  return (
    <TuiSection title="BENCHMARK_ARCHIVE">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={handleRunTest}
            disabled={isRunning}
            style={{
              backgroundColor: 'var(--colors-ink)',
              color: 'var(--colors-canvas)',
              border: '1px solid var(--colors-hairline)',
              padding: '8px 16px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--rounded-sm)',
              opacity: isRunning ? 0.5 : 1
            }}
          >
            {isRunning ? '[ STRESS TEST IN PROGRESS... ]' : '[ RUN SYSTEM STRESS TEST ]'}
          </button>
          {message && <span className="text-warning">{message}</span>}
        </div>

        <div style={{
          backgroundColor: 'var(--colors-surface-card)',
          border: '1px solid var(--colors-hairline)',
          borderRadius: 'var(--rounded-sm)',
          padding: '16px',
          height: '300px',
          overflowY: 'auto',
          overflowX: 'auto'
        }}>
          <pre style={{ margin: 0, color: 'var(--colors-ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {report}
          </pre>
        </div>
      </div>
    </TuiSection>
  );
}
