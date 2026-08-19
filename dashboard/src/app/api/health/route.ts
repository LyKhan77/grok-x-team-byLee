import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/llama-poller';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const llama = await checkHealth();
    return NextResponse.json({
      status: llama.status === 'ok' ? 'ok' : 'degraded',
      gateway: 'online',
      llama_backend: llama.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', gateway: 'online', error: String(error) },
      { status: 500 }
    );
  }
}
