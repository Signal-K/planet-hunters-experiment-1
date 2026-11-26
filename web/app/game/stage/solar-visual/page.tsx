import { redirect } from 'next/navigation'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import SolarVisualFixture from './SolarVisualFixture'

export default function SolarVisualPage() {
  if (!isDevLauncherEnabled()) redirect('/game')
  return <SolarVisualFixture />
}
