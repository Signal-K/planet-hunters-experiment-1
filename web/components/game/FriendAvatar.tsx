'use client'

import React, { useMemo } from 'react'
import { generateAvatarFacets } from '@/lib/friends/avatar'

interface FriendAvatarProps {
  seed: string
  size?: number
}

export default function FriendAvatar({ seed, size = 40 }: FriendAvatarProps) {
  const facets = useMemo(() => generateAvatarFacets(seed), [seed])
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Player avatar"
      style={{ borderRadius: '50%', border: '1px solid var(--ln-hairline)', flexShrink: 0 }}
    >
      {facets.map((facet, i) => (
        <polygon key={i} points={facet.points} fill={facet.color} />
      ))}
    </svg>
  )
}
