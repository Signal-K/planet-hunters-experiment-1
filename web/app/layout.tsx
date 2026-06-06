import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Landnam — Space Mining',
  description: 'Portrait-canvas space mining browser game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ height: '100%', background: 'var(--ln-void)' }}>
      <body style={{
        minHeight: '100%',
        margin: 0,
        background: 'var(--ln-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
      </body>
    </html>
  )
}
