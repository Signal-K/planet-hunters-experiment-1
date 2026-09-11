import PocketBase from 'pocketbase'
import { SHARED_PB_URL } from '@/lib/pb-config'

// Shared backend — auth + citizen science.
// URL resolution (and the deployed-but-pointing-at-localhost detection that
// goes with it) lives in pb-config.ts, shared with pbLandnam.
export const pbShared = new PocketBase(SHARED_PB_URL)
