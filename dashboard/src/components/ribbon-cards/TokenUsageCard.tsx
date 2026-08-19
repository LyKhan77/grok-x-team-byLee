'use client';

import { useState, useEffect } from 'react';
import { TuiSection } from '../ui/TuiSection';

interface UsageAggregate {
  ip_address: string;
  total_prompt: number;
  total_completion: number;
  last_active: string;
}

interface UsageHistory {
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  model: string;
}

export function TokenUsageCard() {
  const [data, setData] = useState<UsageAggregate[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [history, setHistory] = useState<UsageHistory[]>([]);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => res.json())
      .then(json => {
        if (json.aggregated) setData(json.aggregated);
      })
      .catch(console.error);
    
    const interval = setInterval(() => {
      fetch('/api/usage')
        .then(res => res.json())
        .then(json => {
          if (json.aggregated) setData(json.aggregated);
        })
        .catch(console.error);
    }, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedIp) {
      fetch(`/api/usage?ip=${selectedIp}`)
        .then(res => res.json())
        .then(json => {
          if (json.history) setHistory(json.history);
        })
        .catch(console.error);
    }
  }, [selectedIp]);

  const modalView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="text-mute" style={{ marginBottom: '8px' }}>// TOKEN_USAGE_LEADERBOARD (ALL-TIME)</div>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--colors-hairline)', color: 'var(--colors-mute)' }}>
            <th style={{ paddingBottom: '8px' }}>CLIENT_IP</th>
            <th style={{ paddingBottom: '8px' }}>PROMPT_TOK</th>
            <th style={{ paddingBottom: '8px' }}>COMP_TOK</th>
            <th style={{ paddingBottom: '8px' }}>TOTAL_TOK</th>
            <th style={{ paddingBottom: '8px' }}>LAST_SEEN</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={row.ip_address} 
              style={{ 
                borderBottom: '1px dashed var(--colors-hairline)',
                cursor: 'pointer',
                backgroundColor: selectedIp === row.ip_address ? 'var(--colors-surface-soft)' : 'transparent'
              }}
              onClick={() => setSelectedIp(row.ip_address)}
            >
              <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--colors-accent)' }}>{row.ip_address}</td>
              <td style={{ paddingTop: '8px', paddingBottom: '8px' }}>{row.total_prompt.toLocaleString()}</td>
              <td style={{ paddingTop: '8px', paddingBottom: '8px' }}>{row.total_completion.toLocaleString()}</td>
              <td style={{ paddingTop: '8px', paddingBottom: '8px', color: 'var(--colors-success)', fontWeight: 'bold' }}>
                {(row.total_prompt + row.total_completion).toLocaleString()}
              </td>
              <td style={{ paddingTop: '8px', paddingBottom: '8px', fontSize: '12px' }}>{new Date(row.last_active + 'Z').toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedIp && (
        <div style={{ marginTop: '16px', border: '1px solid var(--colors-hairline)', padding: '16px', borderRadius: 'var(--rounded-sm)' }}>
          <div style={{ marginBottom: '16px', color: 'var(--colors-accent)', fontWeight: 'bold' }}>
            {">"} HISTORY: {selectedIp}
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline)', padding: '4px 0' }}>
                <span className="text-mute">{new Date(h.timestamp + 'Z').toLocaleString()}</span>
                <span>[{h.model}]</span>
                <span>P: {h.prompt_tokens} / C: <span className="text-success">{h.completion_tokens}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TuiSection 
      title="TOKEN_USAGE_TRACKER" 
      description="Records historical token consumption (prompt & completion) per IP address using a local SQLite database."
      modalContent={modalView}
    >
      <div style={{ 
        border: '1px solid var(--colors-hairline)',
        backgroundColor: 'var(--colors-surface-soft)',
        borderRadius: 'var(--rounded-sm)',
        padding: '16px'
      }}>
        {data.length === 0 ? (
          <div className="text-mute">{">"} No token usage recorded yet_</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.slice(0, 3).map((row, idx) => (
              <div key={row.ip_address} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="text-mute">#{idx + 1} </span>
                  <span className="text-accent">{row.ip_address}</span>
                </div>
                <div style={{ color: 'var(--colors-success)', fontWeight: 'bold' }}>
                  {(row.total_prompt + row.total_completion).toLocaleString()} tok
                </div>
              </div>
            ))}
            {data.length > 3 && (
              <div className="text-mute" style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                + {data.length - 3} MORE IPs (Click [EXPAND_] to view all)
              </div>
            )}
          </div>
        )}
      </div>
    </TuiSection>
  );
}
