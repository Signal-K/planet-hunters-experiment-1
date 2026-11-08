'use client'

import AppErrorRecovery from '@/components/AppErrorRecovery'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <AppErrorRecovery error={error} reset={reset} />
}
