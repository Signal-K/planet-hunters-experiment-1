import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/lib/brand'
import './globals.css'

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  // SSL-322: iOS only honours installed-app chrome via these apple- tags.
  appleWebApp: { capable: true, title: PRODUCT_NAME, statusBarStyle: 'black' },
  formatDetection: { telephone: false },
}

// viewport-fit=cover exposes env(safe-area-inset-*) on notched iPhones; the
// body pads itself with those insets (globals.css).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#030912',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <Script id="pwa-standalone" strategy="afterInteractive">{`
          // body[data-pwa="standalone"] drives the installed-app layout rules.
          // iOS reports installs via navigator.standalone, others via display-mode.
          if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
            document.body.setAttribute('data-pwa', 'standalone')
          }
        `}</Script>
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
