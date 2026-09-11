import PocketBase from 'pocketbase'
import { sharedPbUrl } from '@/lib/pb-config'

// Shared backend — auth + citizen science
export const pbShared = new PocketBase(sharedPbUrl())
