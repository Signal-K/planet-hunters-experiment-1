'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

interface Props {
  size?: number
  /** Called continuously with normalized axes -1..1 while held, then (0,0) on release */
  onChange: (dx: number, dy: number) => void
  label?: string
  style?: React.CSSProperties
}

export default function VirtualJoystick({ size = 84, onChange, label, style }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const activePtr = useRef<number | null>(null)
  const held = useRef(false)

  const deadR = size * 0.08
  const maxR = size * 0.38

  const emit = useCallback((px: number, py: number) => {
    const dist = Math.sqrt(px * px + py * py)
    // apply dead zone
    if (dist < deadR) {
      onChange(0, 0)
    } else {
      const scale = (dist - deadR) / (maxR - deadR)
      onChange((px / dist) * scale, (py / dist) * scale)
    }
  }, [deadR, maxR, onChange])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxR) {
      dx = (dx / dist) * maxR
      dy = (dy / dist) * maxR
    }
    setKnob({ x: dx, y: dy })
    emit(dx, dy)
  }, [maxR, emit])

  const handleEnd = useCallback(() => {
    activePtr.current = null
    held.current = false
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }, [onChange])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const onDown = (e: PointerEvent) => {
      if (activePtr.current !== null) return
      activePtr.current = e.pointerId
      held.current = true
      el.setPointerCapture(e.pointerId)
      handleMove(e.clientX, e.clientY)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activePtr.current) return
      handleMove(e.clientX, e.clientY)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activePtr.current) return
      handleEnd()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [handleMove, handleEnd])

  const knobR = size * 0.27

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, ...style }}>
      <div
        ref={trackRef}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'rgba(155,236,255,0.06)',
          border: '1.5px solid rgba(155,236,255,0.22)',
          position: 'relative',
          touchAction: 'none',
          userSelect: 'none',
          cursor: 'crosshair',
          flexShrink: 0,
        }}
      >
        {/* centre pip */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 4, height: 4, borderRadius: '50%',
          background: 'rgba(155,236,255,0.3)',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />
        {/* knob */}
        <div style={{
          position: 'absolute',
          width: knobR * 2,
          height: knobR * 2,
          borderRadius: '50%',
          background: 'rgba(155,236,255,0.22)',
          border: '1.5px solid rgba(155,236,255,0.55)',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: held.current ? 'none' : 'transform 0.18s cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: 'none',
        }} />
      </div>
      {label && (
        <span style={{
          fontFamily: 'var(--ln-font-display)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'rgba(155,236,255,0.4)',
          textTransform: 'uppercase',
        }}>{label}</span>
      )}
    </div>
  )
}
