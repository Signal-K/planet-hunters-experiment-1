import { useCallback } from 'react'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import type { SkillBranch } from '@/lib/data'
import {
  applyAssignCrewToStructure,
  applyCollectCrewTraining,
  applyHireCrew,
  applyRehireCrew,
  applyResearchAcademy,
  applyResearchCrewModule,
  applySetAcademyFunding,
  applyShareChartsWithClient,
  applyStartCandidateTraining,
  applyStartCrewTraining,
} from '@/lib/systems/AcademySystem'
import { applyResearchLanding } from '@/lib/systems/LandingSystem'
import { enqueueSurvey } from '@/lib/surveys'
import type { Toast } from '@/components/ui/ToastLayer'

export function useAcademyActions(
  stateRef: React.RefObject<GameState>,
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  getCatalog: () => Catalog,
  addToast: (message: string, kind?: Toast['kind']) => void,
) {
  const researchAcademy = useCallback(() => {
    setState(state => applyResearchAcademy(state))
  }, [setState])

  // Not a crew/academy mechanic, but shares this hook's research-spending
  // wiring — see lib/systems/LandingSystem.ts.
  const researchLanding = useCallback(() => {
    setState(state => applyResearchLanding(state))
  }, [setState])

  const setAcademyFunding = useCallback((funded: boolean) => {
    setState(state => applySetAcademyFunding(state, funded))
    addToast(funded ? 'Academy funding restored' : 'Academy funding paused', 'info')
  }, [addToast, setState])

  const hireCrew = useCallback((sourceId: string) => {
    const current = stateRef.current
    const before = (current.player.crew ?? []).filter(member => !member.selfTrained).length
    const next = applyHireCrew(current, sourceId, getCatalog().clients)
    if (next === current) return
    setState(next)
    addToast(`${next.player.crew?.at(-1)?.name ?? 'Astronaut'} joined the roster`, 'ok')
    if (before === 0) enqueueSurvey('lnm_crew_first_hire', 1200)
  }, [addToast, getCatalog, setState, stateRef])

  const rehireCrew = useCallback((crewId: string) => {
    setState(state => applyRehireCrew(state, crewId))
  }, [setState])

  const startCrewTraining = useCallback((crewId: string, branch: SkillBranch) => {
    setState(state => applyStartCrewTraining(state, crewId, branch))
  }, [setState])

  const startCandidateTraining = useCallback((branch: SkillBranch) => {
    setState(state => applyStartCandidateTraining(state, branch))
  }, [setState])

  const collectCrewTraining = useCallback((sessionId: string) => {
    const current = stateRef.current
    const before = (current.player.crew ?? []).some(member => member.specialisations.length > 0)
    const next = applyCollectCrewTraining(current, sessionId)
    if (next === current) return
    setState(next)
    addToast('Training complete · roster and Academy level updated', 'ok')
    if (!before) enqueueSurvey('lnm_crew_first_specialisation', 1200)
  }, [addToast, setState, stateRef])

  const researchCrewModule = useCallback(() => {
    setState(state => applyResearchCrewModule(state))
  }, [setState])

  const assignCrewToStructure = useCallback((structureId: string, crewId: string | null) => {
    setState(state => applyAssignCrewToStructure(state, structureId, crewId))
  }, [setState])

  const shareChartsWithClient = useCallback((clientId: string) => {
    setState(state => applyShareChartsWithClient(state, clientId))
  }, [setState])

  return {
    researchAcademy,
    researchLanding,
    setAcademyFunding,
    hireCrew,
    rehireCrew,
    startCrewTraining,
    startCandidateTraining,
    collectCrewTraining,
    researchCrewModule,
    assignCrewToStructure,
    shareChartsWithClient,
  }
}
