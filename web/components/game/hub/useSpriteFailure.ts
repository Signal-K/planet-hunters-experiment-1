'use client'

import { useEffect, useRef, useState } from 'react'

/** Error events may fire before hydration; also inspect an already-complete image. */
export function useSpriteFailure(src: string) {
  const image = useRef<HTMLImageElement>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  useEffect(() => {
    const element = image.current
    if (element?.complete && element.naturalWidth === 0) setFailedSource(src)
  }, [src])
  return { image, failed: failedSource === src, onError: () => setFailedSource(src) }
}
