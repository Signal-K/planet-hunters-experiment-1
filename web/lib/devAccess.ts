export function isDevLauncherEnabled(): boolean {
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV
  const deployEnv = process.env.NEXT_PUBLIC_LANDNAM_ENV ?? process.env.NEXT_PUBLIC_DEPLOY_ENV

  if (vercelEnv === 'production' || deployEnv === 'production') return false
  if (process.env.NODE_ENV === 'development') return true
  if (vercelEnv === 'preview') return true
  if (deployEnv === 'staged' || deployEnv === 'staging') return true

  return false
}
