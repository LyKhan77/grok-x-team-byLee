import { NextResponse } from 'next/server';
import { registerClientIp } from '@/lib/llama-poller';
import { logUsage } from '@/lib/db';

const LLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://192.168.2.143:8001';

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
    
    // 2. Register IP
    registerClientIp(ip);

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
    const auth = req.headers.get('authorization');
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
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          // Pass chunk to user immediately
          controller.enqueue(chunk);
          
          // Sniff chunk for token usage asynchronously
          try {
            const text = new TextDecoder().decode(chunk);
            if (text.includes('"usage"')) {
              // Extract the usage object from SSE lines
              const lines = text.split('\\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.usage && typeof data.usage.prompt_tokens === 'number') {
                      logUsage(ip, data.usage.prompt_tokens, data.usage.completion_tokens, modelName);
                    }
                  } catch (e) {
                    // Ignore malformed JSON in chunk
                  }
                }
              }
            }
          } catch(e) {
            // Silently fail sniffing, do not break stream
          }
        }
      });

      return new Response(response.body.pipeThrough(transformStream), {
        headers: response.headers,
      });
    } else {
      // Non-streaming response, intercept full JSON
      const data = await response.json();
      if (data.usage) {
        logUsage(ip, data.usage.prompt_tokens, data.usage.completion_tokens, modelName);
      }
      return NextResponse.json(data);
    }
    
  } catch (error) {
    console.error('API Gateway Error:', error);
    return NextResponse.json({ error: 'Internal API Gateway Error' }, { status: 500 });
  }
}
