import { NextResponse } from 'next/server';
import { getAggregatedUsage, getUsageHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ip = url.searchParams.get('ip');

    if (ip) {
      // Detailed history for specific IP
      const history = getUsageHistory(ip);
      return NextResponse.json({ history });
    }

    // Aggregated list of all IPs
    const aggregated = getAggregatedUsage();
    return NextResponse.json({ aggregated });
  } catch (error) {
    console.error('Usage API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
