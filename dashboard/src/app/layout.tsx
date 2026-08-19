import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jbMono = JetBrains_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CooperAgent Telemetry',
  description: 'Real-time monitoring for on-premise LLM inference server',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jbMono.className}>{children}</body>
    </html>
  );
}
