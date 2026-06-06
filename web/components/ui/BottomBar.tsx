'use client'

import React from 'react'

interface BottomBarProps {
  left?: React.ReactNode
  right?: React.ReactNode
}

export default function BottomBar({ left, right }: BottomBarProps) {
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      padding: '10px 14px 24px',
      background: 'linear-gradient(180deg, transparent 0%, rgba(6,9,15,0.93) 30%, #06090f 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {left}
      <span style={{ flex: 1 }} />
      {right}
    </div>
  )
}
