import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Landnam — Space Mining',
  description: 'Portrait-canvas space mining browser game',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ height: '100%', background: 'var(--ln-void)' }}>
      <head>
        <meta name="theme-color" content="#030912" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{
        minHeight: '100%',
        margin: 0,
        background: 'var(--ln-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
        {process.env.NODE_ENV === 'production' && (
          <Script id="sw-register" strategy="afterInteractive">{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
            }
          `}</Script>
        )}
      </body>
    </html>
  )
}
