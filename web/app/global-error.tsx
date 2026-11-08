'use client'

import AppErrorRecovery from '@/components/AppErrorRecovery'

export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AppErrorRecovery error={error} />
      </body>
    </html>
  )
}
