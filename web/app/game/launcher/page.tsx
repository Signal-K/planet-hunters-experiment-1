import { redirect } from 'next/navigation'
import DevLauncher from '@/components/dev/DevLauncher'
import { isDevLauncherEnabled } from '@/lib/devAccess'

export default function LauncherPage() {
  if (!isDevLauncherEnabled()) redirect('/game')
  return <DevLauncher />
}
