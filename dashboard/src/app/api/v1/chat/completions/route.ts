import { NextResponse } from 'next/server';
import { registerClientIp } from '@/lib/llama-poller';
import { logUsage } from '@/lib/db';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Extract Client IP & Developer Identity
    let ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             req.headers.get('remote-addr') || 
             'Local/Direct';
    
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    const auth = req.headers.get('authorization') || '';
    let devName = '';
    if (auth.startsWith('Bearer dev-')) {
      devName = auth.slice('Bearer dev-'.length).trim();
    } else if (auth.startsWith('Bearer ')) {
      const key = auth.slice('Bearer '.length).trim();
      if (key !== 'sk-internal-team' && key.length > 0) {
        devName = key;
      }
    }

    const clientIdentifier = devName ? `${devName} (${ip})` : ip;
    
    // 2. Register Client Identity
    registerClientIp(clientIdentifier);

    // 3. Parse Request to Inject stream_options
    let bodyObj = {};
    try {
      bodyObj = await req.json();
    } catch(e) {}
    
    const isStream = (bodyObj as any).stream === true;
    const modelName = (bodyObj as any).model || 'unknown';

    if (isStream) {
      (bodyObj as any).stream_options = { include_usage: true };
    }

    const modifiedBody = JSON.stringify(bodyObj);

    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    if (auth) headers.set('Authorization', auth);

    // 4. Proxy Request
    const response = await fetch(`${LLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: modifiedBody,
      // @ts-ignore
      duplex: 'half'
    });

    if (!response.ok || !response.body) {
      return new Response(response.body, { status: response.status, headers: response.headers });
    }

    // 5. Stream Interception
    if (isStream) {
      const [streamForUser, streamForLog] = response.body.tee();

      // Background process to sniff token usage
      (async () => {
        try {
          const reader = streamForLog.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (typeof value === 'string') {
              buffer += value;
            } else {
              buffer += decoder.decode(value, { stream: true });
            }
          }

          // Parse when stream is completely done
          const lines = buffer.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.usage && typeof data.usage.prompt_tokens === 'number') {
                  logUsage(clientIdentifier, data.usage.prompt_tokens, data.usage.completion_tokens, modelName);
                }
              } catch (e) {
                // Ignore incomplete JSON
              }
            }
          }
        } catch (e) {
          console.error("Background Sniffer Error:", e);
        }
      })();

      return new Response(streamForUser, { headers: response.headers });
    } else {
      // Non-streaming response, intercept full JSON
      const data = await response.json();
      if (data.usage) {
        logUsage(clientIdentifier, data.usage.prompt_tokens, data.usage.completion_tokens, modelName);
      }
      return NextResponse.json(data);
    }
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return NextResponse.json({ error: 'Internal API Gateway Error' }, { status: 500 });
  }
}
