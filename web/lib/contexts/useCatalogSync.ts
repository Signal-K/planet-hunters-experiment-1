import { useState, useEffect } from 'react'
import { STATIC_CATALOG, fetchCatalog } from '@/lib/catalog'
import type { Catalog } from '@/lib/catalog'
import type { GameState } from '@/lib/game-types'
import type { Toast } from '@/components/ui/ToastLayer'

export function useCatalogSync(
  _state: GameState,
  _setState: React.Dispatch<React.SetStateAction<GameState>>,
  _hydrated: boolean,
  isPreview: boolean,
  addToast: (message: string, kind?: Toast['kind']) => void,
) {
  const [catalog, setCatalog] = useState<Catalog>(STATIC_CATALOG)

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {})
  }, [])

  return { catalog }
}
