import PocketBase from 'pocketbase'

// Shared backend — auth + citizen science
export const pbShared = new PocketBase(
  process.env.NEXT_PUBLIC_SHARED_PB_URL || 'http://localhost:8090'
)
