import PocketBase from 'pocketbase'
import { ASTEROID_SETTLED_LABELS, TESS_SETTLED_LABELS, isSettledConsensusValue } from '../open-anomaly.ts'
import { planSharedSubjectIngest, type IngestPool } from './plan.ts'
import { fetchOpenNeocpCandidates, fetchOpenTessTois, type SourceFetch } from './sources.ts'
import {
  ASTEROID_CANDIDATES_COLLECTION,
  DEFAULT_INGEST_LIMITS,
  TESS_SUBJECTS_COLLECTION,
  type ExistingAsteroidCandidate,
  type ExistingTessSubject,
  type IngestLimits,
  type IngestPlan,
  type PlannedInsert,
} from './types.ts'

export interface IngestEnv {
  sharedPbUrl?: string
  adminEmail?: string
  adminPassword?: string
  tessLimit?: number
  neocpLimit?: number
  write?: boolean
}

export interface IngestRunResult {
  mode: 'write' | 'dry-run'
  plan: IngestPlan
  written: number
  skippedWriteReason: string | null
}

const DEFAULT_SHARED_PB_URL = 'https://signal-k-starsailors.fly.dev'

export function resolveIngestEnv(env: NodeJS.ProcessEnv = process.env): IngestEnv {
  const writeFlag = env.INGEST_WRITE ?? env.INGEST_DRY_RUN
  return {
    sharedPbUrl: env.SHARED_PB_URL || env.PB_STARSAILORS_URL || env.NEXT_PUBLIC_SHARED_PB_URL || DEFAULT_SHARED_PB_URL,
    adminEmail: env.SHARED_PB_ADMIN_EMAIL || env.PB_ADMIN_EMAIL || env.PB_ADMIN_IDENTITY,
    adminPassword: env.SHARED_PB_ADMIN_PASSWORD || env.PB_ADMIN_PASSWORD,
    tessLimit: Number(env.INGEST_TESS_LIMIT || DEFAULT_INGEST_LIMITS.tess),
    neocpLimit: Number(env.INGEST_NEOCP_LIMIT || DEFAULT_INGEST_LIMITS.neocp),
    write: writeFlag === '0' || writeFlag === 'false' ? false : writeFlag === '1' || writeFlag === 'true' ? true : undefined,
  }
}

function ingestLimitsFromEnv(env: IngestEnv): IngestLimits {
  return {
    tess: Number.isFinite(env.tessLimit) && (env.tessLimit ?? 0) > 0 ? Number(env.tessLimit) : DEFAULT_INGEST_LIMITS.tess,
    neocp: Number.isFinite(env.neocpLimit) && (env.neocpLimit ?? 0) > 0 ? Number(env.neocpLimit) : DEFAULT_INGEST_LIMITS.neocp,
  }
}

export function canWriteToSharedPool(env: IngestEnv): boolean {
  return Boolean(env.sharedPbUrl && env.adminEmail && env.adminPassword)
}

async function authSuperuser(pb: PocketBase, email: string, password: string): Promise<void> {
  try {
    await pb.collection('_superusers').authWithPassword(email, password)
  } catch (first) {
    const legacy = pb as PocketBase & {
      admins?: { authWithPassword: (identity: string, password: string) => Promise<unknown> }
    }
    if (!legacy.admins) throw first
    await legacy.admins.authWithPassword(email, password)
  }
}

function mapExistingTess(records: Array<Record<string, unknown>>): ExistingTessSubject[] {
  return records.map(record => ({
    toiId: String(record.toi_id ?? record.toi ?? ''),
    consensus: record.consensus,
    goldLabel: record.gold_label,
  })).filter(row => row.toiId)
}

function mapExistingAsteroids(records: Array<Record<string, unknown>>): ExistingAsteroidCandidate[] {
  return records.map(record => ({
    tempDesig: String(record.temp_desig ?? ''),
    resolved: record.resolved,
    consensus: record.consensus,
    goldLabel: record.gold_label,
  })).filter(row => row.tempDesig)
}

async function loadSharedPool(pb: PocketBase): Promise<IngestPool> {
  const [tess, asteroids] = await Promise.all([
    pb.collection(TESS_SUBJECTS_COLLECTION).getFullList({ sort: 'id', requestKey: null }),
    pb.collection(ASTEROID_CANDIDATES_COLLECTION).getFullList({ sort: '-created', requestKey: null }),
  ])
  return {
    tess: mapExistingTess(tess as unknown as Array<Record<string, unknown>>),
    asteroids: mapExistingAsteroids(asteroids as unknown as Array<Record<string, unknown>>),
  }
}

export async function writePlannedInserts(
  pb: PocketBase,
  inserts: PlannedInsert[],
): Promise<number> {
  let written = 0
  for (const insert of inserts) {
    if (insert.collection === TESS_SUBJECTS_COLLECTION) {
      const consensus = insert.payload.consensus
      const gold = insert.payload.gold_label
      if (isSettledConsensusValue(consensus, TESS_SETTLED_LABELS) || isSettledConsensusValue(gold, TESS_SETTLED_LABELS)) {
        throw new Error(`Refusing to write settled TESS row ${insert.identity}`)
      }
    }
    if (insert.collection === ASTEROID_CANDIDATES_COLLECTION) {
      if (insert.payload.resolved === true) {
        throw new Error(`Refusing to write settled NEOCP row ${insert.identity}`)
      }
      if (isSettledConsensusValue(insert.payload.consensus, ASTEROID_SETTLED_LABELS)
        || isSettledConsensusValue(insert.payload.gold_label, ASTEROID_SETTLED_LABELS)) {
        throw new Error(`Refusing to write settled NEOCP consensus for ${insert.identity}`)
      }
    }
    await pb.collection(insert.collection).create(insert.payload)
    written += 1
  }
  return written
}

export async function runSharedSubjectIngest(options: {
  env?: IngestEnv
  fetch?: SourceFetch['fetch']
  pbFactory?: (url: string) => PocketBase
  forceWrite?: boolean
}): Promise<IngestRunResult> {
  const env = options.env ?? resolveIngestEnv()
  const limits = ingestLimitsFromEnv(env)
  const client: SourceFetch = { fetch: options.fetch ?? globalThis.fetch }
  const [tessRows, neocpRows] = await Promise.all([
    fetchOpenTessTois(client, limits.tess),
    fetchOpenNeocpCandidates(client, limits.neocp),
  ])

  const shouldWrite = options.forceWrite ?? env.write ?? canWriteToSharedPool(env)
  if (!shouldWrite || !canWriteToSharedPool(env)) {
    const plan = planSharedSubjectIngest(tessRows, neocpRows, { tess: [], asteroids: [] }, limits)
    plan.notes.push(
      'Dry-run: shared PocketBase admin credentials were not available (SHARED_PB_ADMIN_EMAIL / SHARED_PB_ADMIN_PASSWORD or PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD). No rows written.',
    )
    return {
      mode: 'dry-run',
      plan,
      written: 0,
      skippedWriteReason: 'missing shared PocketBase admin credentials',
    }
  }

  const pb = (options.pbFactory ?? ((url: string) => new PocketBase(url)))(env.sharedPbUrl as string)
  await authSuperuser(pb, env.adminEmail as string, env.adminPassword as string)
  const pool = await loadSharedPool(pb)
  const plan = planSharedSubjectIngest(tessRows, neocpRows, pool, limits)
  const written = await writePlannedInserts(pb, [...plan.tessInserted, ...plan.neocpInserted])
  return { mode: 'write', plan, written, skippedWriteReason: null }
}
