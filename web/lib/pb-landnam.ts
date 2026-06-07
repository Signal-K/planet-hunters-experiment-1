import PocketBase from 'pocketbase'

export const pbLandnam = new PocketBase(
  process.env.NEXT_PUBLIC_LANDNAM_PB_URL || 'http://localhost:8093'
)
