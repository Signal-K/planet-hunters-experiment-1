// Kept apart from the map and its callers so the hub can warm the chunk while online
// without pulling the mission plan strip into the main bundle.
export const loadPixiGalaxyMap = () => import('@/components/TargetPicker/PixiGalaxyMap')
