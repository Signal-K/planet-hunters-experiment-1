/** A mission's category describes its purpose, not the current location of its rocket. */
export function debriefStatus({ shipDestroyed, orbitalDeployment, homeSettled, dismantled }: {
  shipDestroyed: boolean
  orbitalDeployment: boolean
  homeSettled: boolean
  dismantled: boolean
}) {
  const recycled = homeSettled || dismantled
  return {
    status: shipDestroyed ? 'Hull lost · cargo recovered'
      : orbitalDeployment ? 'Commissioned · instrument online'
      : homeSettled ? 'Returned to Earth · rocket recycled'
      : dismantled ? 'Rocket recycled · mission complete' : 'Mission complete',
    destinationLabel: homeSettled ? 'Returned from' : 'Mission destination',
    canTeardown: !shipDestroyed && !orbitalDeployment && !recycled,
  }
}
