// SSL-714: real BRAMS radio spectrograms from Radio Meteor Zoo (Zooniverse project 2471), read
// through the public Panoptes API. Players box the meteor echoes; their classifications are kept
// in Landnam's own PocketBase (radio_meteor_classifications), never posted to Zooniverse.

import { pbLandnam } from '@/lib/pb-landnam'
import { queueUpsert } from '@/lib/offline/pbOutbox'
import { pocketBaseId } from '@/lib/orionids/finds'

export const RADIO_METEOR_PROJECT_ID = '2471'
/** Used only when the live workflow cannot be looked up (Perseids 2026, opened 14 Oct 2026). */
export const RADIO_METEOR_FALLBACK_WORKFLOW = '33017'

const PANOPTES = 'https://www.zooniverse.org/api'
const HEADERS = { Accept: 'application/vnd.api+json; version=1' }

/** A box in source-image pixels, the Panoptes rectangle-tool shape. */
export interface RadioMeteorBox { x: number; y: number; width: number; height: number }

export interface RadioMeteorSubject {
  id: string
  workflowId: string
  workflowName: string
  imageUrl: string
  filename: string
  /** BRAMS receiving station, from the file name (BEDOUR is Dourbes, Belgium). */
  station: string
  /** UTC start of the 5-minute recording, from the file name. */
  recordedAt: string | null
}

export interface RadioMeteorClassification {
  subjectId: string
  workflowId: string
  imageUrl: string
  filename: string
  imageWidth: number
  imageHeight: number
  boxes: RadioMeteorBox[]
  submittedAt: number
}

const STATION_NAMES: Record<string, string> = { BEDOUR: 'Dourbes', BEHUMA: 'Humain', BEUCCL: 'Uccle', BEOTTI: 'Ottignies', BEGENK: 'Genk' }

/** RAD_BEDOUR_20260725_1355_BEECON_SYS001.png → Dourbes, 2026-07-25 13:55 UTC. */
export function parseRadioFilename(filename: string): { station: string; recordedAt: string | null } {
  const m = /RAD_([A-Z]+)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/.exec(filename)
  if (!m) return { station: 'BRAMS', recordedAt: null }
  return { station: STATION_NAMES[m[1]] ?? m[1], recordedAt: `${m[2]}-${m[3]}-${m[4]} ${m[5]}:${m[6]} UTC` }
}

async function panoptes<T>(path: string): Promise<T> {
  const res = await fetch(`${PANOPTES}${path}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Panoptes ${res.status}`)
  return res.json() as Promise<T>
}

/** The project's live workflow (one per shower season). */
export async function fetchActiveRadioWorkflow(): Promise<{ id: string; name: string }> {
  try {
    const data = await panoptes<{ workflows: Array<{ id: string; display_name: string; active: boolean; completeness: number }> }>(`/workflows?project_id=${RADIO_METEOR_PROJECT_ID}&active=true`)
    const live = data.workflows.filter(w => w.active && w.completeness < 1)
    const pick = live[live.length - 1]
    if (pick) return { id: pick.id, name: pick.display_name }
  } catch { /* fall through */ }
  return { id: RADIO_METEOR_FALLBACK_WORKFLOW, name: 'Perseids 2026' }
}

/** Spectrograms the project still needs looked at, minus ones this player already did. */
export async function fetchQueuedRadioSubjects(done: Record<string, unknown> = {}): Promise<RadioMeteorSubject[]> {
  const workflow = await fetchActiveRadioWorkflow()
  const data = await panoptes<{ subjects: Array<{ id: string; locations: Array<Record<string, string>>; metadata: Record<string, string> }> }>(`/subjects/queued?workflow_id=${workflow.id}&page_size=10`)
  return data.subjects
    .filter(s => !done[s.id])
    .map(s => {
      const imageUrl = Object.values(s.locations[0] ?? {})[0] ?? ''
      const filename = s.metadata?.filename ?? s.metadata?.Filename ?? ''
      return { id: s.id, workflowId: workflow.id, workflowName: workflow.name, imageUrl, filename, ...parseRadioFilename(filename) }
    })
    .filter(s => s.imageUrl)
}

/** Landnam-side record, through the offline outbox. */
export function queueRadioMeteorClassification(c: RadioMeteorClassification, eventId?: string): void {
  const user = pbLandnam.authStore.record?.id
  if (!user) return
  const subjectId = c.subjectId.replace(/["\\]/g, '')
  void queueUpsert(
    'radio_meteor_classifications',
    `user = "${user}" && subject_id = "${subjectId}"`,
    {
      user,
      subject_id: subjectId,
      workflow_id: c.workflowId,
      project_id: RADIO_METEOR_PROJECT_ID,
      image_url: c.imageUrl,
      filename: c.filename,
      image_width: c.imageWidth,
      image_height: c.imageHeight,
      boxes: c.boxes,
      echo_count: c.boxes.length,
      event_id: eventId ?? '',
      submitted_at: c.submittedAt,
    },
    pocketBaseId(`radio_meteor_classifications:${user}:${subjectId}`),
  )
}
