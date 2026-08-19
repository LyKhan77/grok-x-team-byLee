'use client';

import { useState, useEffect } from 'react';
import { RibbonCard } from '../ui/RibbonCard';
import styles from './BenchmarkCard.module.css';

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
    // Poll the report occasionally in case a test is running and finishes
    const interval = setInterval(fetchReport, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunTest = async () => {
    if (!confirm('WARNING: Triggering the stress test will generate heavy load on the GPUs for the next few minutes. Are you sure?')) {
      return;
    }

    setIsRunning(true);
    setMessage('INITIATING STRESS TEST...');

    try {
      const res = await fetch('/api/benchmark', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage('Error: ' + data.error);
        setIsRunning(false);
      }
    } catch {
      setMessage('Failed to reach server.');
      setIsRunning(false);
    }
    
    // Reset running state after a generous timeout since we don't have websocket progress
    setTimeout(() => {
      setIsRunning(false);
      setMessage('');
      fetchReport();
    }, 120000); // 2 minutes
  };

  return (
    <RibbonCard
      title="BENCHMARK & STRESS-TEST ARCHIVE VIEWER"
      tint="sage"
    >
      <div className={styles.container}>
        <div className={styles.actions}>
          <button 
            className={`typo-button ${styles.triggerBtn}`} 
            onClick={handleRunTest}
            disabled={isRunning}
          >
            {isRunning ? '[ STRESS TEST IN PROGRESS... ]' : '[ RUN SYSTEM STRESS TEST ]'}
          </button>
          {message && <span className={styles.statusMessage}>{message}</span>}
        </div>

        <div className={styles.viewerFrame}>
          <pre className={`typo-body-sm ${styles.markdownText}`}>
            {report}
          </pre>
        </div>
      </div>
    </RibbonCard>
  );
}
