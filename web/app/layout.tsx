import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
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
    <html lang="en">
      <head>
        <meta name="theme-color" content="#030912" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <Analytics />
        {process.env.NODE_ENV === 'production' ? (
          <Script id="sw-register" strategy="afterInteractive">{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker
                .register('/sw.js', { updateViaCache: 'none' })
                .then(registration => registration.update())
            }
          `}</Script>
        ) : (
          <Script id="sw-dev-cleanup" strategy="beforeInteractive">{`
            // A service worker installed by a prior production/PWA run keeps
            // controlling localhost even after Next switches back to dev.
            // That made branch UI work appear unchanged because the browser
            // continued serving an old cached game shell. Dev never needs the
            // offline shell, so remove both the worker and Landnam caches.
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations()
                .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
            }
            if ('caches' in window) {
              caches.keys()
                .then(keys => Promise.all(keys.filter(key => key.startsWith('landnam-shell-')).map(key => caches.delete(key))))
            }
          `}</Script>
        )}
      </body>
    </html>
  )
}
