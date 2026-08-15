export function isDevLauncherEnabled(): boolean {
  const deployEnv = process.env.NEXT_PUBLIC_LANDNAM_ENV ?? process.env.NEXT_PUBLIC_DEPLOY_ENV

  if (deployEnv === 'production') return false
  if (process.env.NODE_ENV === 'development') return true
  if (deployEnv === 'staged' || deployEnv === 'staging' || deployEnv === 'preview') return true

  return false
}
