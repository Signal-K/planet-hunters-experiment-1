export interface ReturnNotification {
  scheduledFor: number
  title: string
  body: string
}

/**
 * The "rocket returned" push for the Earth-return transit leg, scheduled for
 * the leg's real arrival time. Outbound and delivery legs, and untimed
 * onboarding legs (no arrivalAt), get no return push.
 */
export function returnNotification(args: {
  arrivalAt: number | null | undefined
  returningToEarth: boolean | undefined
  missionTitle?: string
  /** Where the rocket is returning from: the delivery stop on two-leg jobs. */
  originName?: string
}): ReturnNotification | null {
  if (!args.arrivalAt || !args.returningToEarth) return null
  return {
    scheduledFor: args.arrivalAt,
    title: args.missionTitle ? `${args.missionTitle} — RETURNED` : 'ROCKET RETURNED',
    body: args.originName
      ? `Your rocket has returned from ${args.originName}. Cargo is ready for debrief.`
      : 'Your rocket has returned to Earth.',
  }
}
