import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GSPE Internal LLM Telemetry Dashboard',
  description: 'Real-time monitoring for on-premise LLM inference server — 3x RTX 3090 GPU Cluster',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
