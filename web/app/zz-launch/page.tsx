'use client'
import { LaunchSequenceCanvas } from '@/components/game/LaunchSequenceCanvas'
export default function P() {
  return <div style={{ position: 'fixed', inset: 0 }}><LaunchSequenceCanvas rocketName="Explorer" targetName="433 Eros" onComplete={() => {}} /></div>
}
