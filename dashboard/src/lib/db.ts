import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'usage.db');
const db = new Database(dbPath);

// Initialize Schema with WAL mode for better concurrency
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    model TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ip ON usage_logs(ip_address);
  CREATE INDEX IF NOT EXISTS idx_time ON usage_logs(timestamp);
`);

export function logUsage(ip: string, promptTokens: number, completionTokens: number, model: string = 'unknown') {
  try {
    const stmt = db.prepare('INSERT INTO usage_logs (ip_address, prompt_tokens, completion_tokens, model) VALUES (?, ?, ?, ?)');
    stmt.run(ip, promptTokens, completionTokens, model);
  } catch (error) {
    console.error('Failed to log usage to DB:', error);
  }
}

export function getAggregatedUsage() {
  try {
    const stmt = db.prepare(`
      SELECT 
        ip_address, 
        SUM(prompt_tokens) as total_prompt, 
        SUM(completion_tokens) as total_completion,
        MAX(timestamp) as last_active
      FROM usage_logs
      GROUP BY ip_address
      ORDER BY total_completion DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error('Failed to get aggregated usage:', error);
    return [];
  }
}

export function getUsageHistory(ip_address: string, limit: number = 50) {
  try {
    const stmt = db.prepare(`
      SELECT timestamp, prompt_tokens, completion_tokens, model 
      FROM usage_logs 
      WHERE ip_address = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(ip_address, limit);
  } catch (error) {
    console.error('Failed to get usage history:', error);
    return [];
  }
}
