'use client'

import React from 'react'

interface CoachAvatarProps {
  size?: number
  talking?: boolean
}

export default function CoachAvatar({ size = 44, talking }: CoachAvatarProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 999,
      flexShrink: 0,
      background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c4f86)',
      border: '2px solid #aef',
      boxShadow: '0 0 14px rgba(63,169,255,0.7), inset 0 2px 0 rgba(255,255,255,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      animation: talking ? 'coach-bob 1.2s ease-in-out infinite' : 'none',
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path d="M5 13 a7 7 0 0 1 14 0 v3 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 z" fill="#0a1422" stroke="#cde4ff" strokeWidth="1.2"/>
        <path d="M7.5 11 a4.5 4.5 0 0 1 9 0 v2 h-9 z" fill="#87CFFA"/>
        <ellipse cx="10" cy="11" rx="1.4" ry="2" fill="#fff" opacity="0.7"/>
      </svg>
    </div>
  )
}
