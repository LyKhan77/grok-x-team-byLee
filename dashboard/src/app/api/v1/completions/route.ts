import { NextResponse } from 'next/server';
import { registerClientIp } from '@/lib/llama-poller';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';

// We want to force dynamic proxy behavior
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Extract Client IP
    let ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('remote-addr') || 
             'Local/Direct';
    
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    
    // 2. Register IP to our Global Poller Queue
    registerClientIp(ip);

    // 3. Proxy the request to llama-server
    const body = await req.text();
    
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    const auth = req.headers.get('authorization');
    if (auth) headers.set('Authorization', auth);

    const response = await fetch(`${LLAMA_URL}/v1/completions`, {
      method: 'POST',
      headers,
      body,
      // For streaming
      // @ts-ignore - Next.js internal duplex needed for streaming body forwarding sometimes
      duplex: 'half'
    });

    // 4. Return the streaming response directly to the client
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return NextResponse.json({ error: 'Internal API Gateway Error' }, { status: 500 });
  }
}
