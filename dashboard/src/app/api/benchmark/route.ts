import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PROJECT_ROOT = path.join(process.cwd(), '..'); // dashboard is inside gspexgrok-agent/dashboard
const REPORT_PATH = path.join(PROJECT_ROOT, 'test/results/benchmark_report.md');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'test/run_stress_test.sh');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (fs.existsSync(REPORT_PATH)) {
      const content = fs.readFileSync(REPORT_PATH, 'utf-8');
      return NextResponse.json({ content });
    } else {
      return NextResponse.json({ content: 'No benchmark report found. Run a stress test first.' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read report' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Spawn the test script in the background
    const child = spawn('bash', [SCRIPT_PATH], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: 'ignore'
    });
    
    // Unref allows the parent to exit independently of the child
    child.unref();

    return NextResponse.json({ status: 'started', message: 'Stress test initiated in the background. Check back in a few minutes.' });
  } catch (error) {
    console.error('Failed to start stress test:', error);
    return NextResponse.json({ error: 'Failed to start script' }, { status: 500 });
  }
}
