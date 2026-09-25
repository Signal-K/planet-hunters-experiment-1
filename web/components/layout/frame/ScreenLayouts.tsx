'use client'

import type { ReactNode } from 'react'
import ScreenFrame, { type FrameSurface } from './ScreenFrame'

/** Slots a layout type accepts. Per-type props are added as each type gets
 * its own chrome (SSL-35 follow-up PRs). */
export interface LayoutSlots {
  top?: ReactNode
  bottom?: ReactNode
  overlay?: ReactNode
  children: ReactNode
}

function LandingLayout(props: LayoutSlots) { return <ScreenFrame surface="landing" {...props} /> }
function LaunchLayout(props: LayoutSlots) { return <ScreenFrame surface="launch" {...props} /> }
function OrbitLayout(props: LayoutSlots) { return <ScreenFrame surface="orbit" {...props} /> }
function MiningLayout(props: LayoutSlots) { return <ScreenFrame surface="mining" {...props} /> }
function HomeLayout(props: LayoutSlots) { return <ScreenFrame surface="home" {...props} /> }
function InstrumentLayout(props: LayoutSlots) { return <ScreenFrame surface="instrument" {...props} /> }
function MapLayout(props: LayoutSlots) { return <ScreenFrame surface="map" {...props} /> }
function TakeonLayout(props: LayoutSlots) { return <ScreenFrame surface="takeon" {...props} /> }
function MissionSetupLayout(props: LayoutSlots) { return <ScreenFrame surface="mission-setup" {...props} /> }
function PostMissionLayout(props: LayoutSlots) { return <ScreenFrame surface="post-mission" {...props} /> }

const LAYOUT_COMPONENTS: Record<FrameSurface, (props: LayoutSlots) => ReactNode> = {
  landing: LandingLayout,
  launch: LaunchLayout,
  orbit: OrbitLayout,
  mining: MiningLayout,
  home: HomeLayout,
  instrument: InstrumentLayout,
  map: MapLayout,
  takeon: TakeonLayout,
  'mission-setup': MissionSetupLayout,
  'post-mission': PostMissionLayout,
}

/**
 * Route-driven entry point used by the game shell. It always renders the one
 * `ScreenFrame` element type, so moving between screens of different layout
 * types re-labels the frame instead of remounting the screen tree under it.
 */
export function SurfaceLayout({ surface, ...slots }: LayoutSlots & { surface: FrameSurface }) {
  return <ScreenFrame surface={surface} {...slots} />
}
