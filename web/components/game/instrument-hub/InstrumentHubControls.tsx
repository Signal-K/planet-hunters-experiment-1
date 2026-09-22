'use client'

import { useCallback, useRef } from 'react'
import { triggerHaptic } from '@/lib/haptics'
import type { InstrumentSourceFilter } from '@/lib/instrument-hub-state'
import { CHROME_CONTROLS } from './hub-chrome-layout'
import styles from './InstrumentHubControls.module.css'

interface InstrumentHubControlsProps {
  sourceFilter: InstrumentSourceFilter
  unresolvedOnly: boolean
  selectedIndex: number
  visibleCount: number
  gain: number
  zoom: number
  scrub: number
  armed: boolean
  transitEnabled: boolean
  neocpEnabled: boolean
  highlightStrong: boolean
  autoAdvance: boolean
  onSourceFilter: (filter: InstrumentSourceFilter) => void
  onToggleUnresolved: () => void
  onSelectIndex: (index: number) => void
  onGainChange: (gain: number) => void
  onZoomChange: (zoom: number) => void
  onScrubChange: (scrub: number) => void
  onToggleTransit: () => void
  onToggleNeocp: () => void
  onToggleArmed: () => void
  onToggleHighlight: () => void
  onToggleAutoAdvance: () => void
  onOpenInspector: () => void
  onSnoozePing: () => void
}

function pct(value: number): string {
  return `${value}%`
}

function valueFromPointer(clientX: number, rect: DOMRect): number {
  const ratio = (clientX - rect.left) / rect.width
  return Math.min(100, Math.max(0, ratio * 100))
}

export function InstrumentHubControls(props: InstrumentHubControlsProps) {
  const dragRef = useRef<{ id: string; startY: number; startValue: number } | null>(null)

  const handlePress = useCallback((kind: 'press' | 'change' = 'press') => {
    triggerHaptic(kind)
  }, [])

  const startDrag = useCallback((id: string, startValue: number, event: React.PointerEvent<HTMLElement>) => {
    dragRef.current = { id, startY: event.clientY, startValue }
    event.currentTarget.setPointerCapture(event.pointerId)
    triggerHaptic('drag')
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const delta = (drag.startY - event.clientY) / 2.4
    if (drag.id === 'gain-knob' || drag.id.startsWith('gain-fine')) {
      props.onGainChange(Math.round(drag.startValue + delta))
      triggerHaptic('change')
      return
    }
    if (drag.id === 'zoom-dial') {
      props.onZoomChange(Number((drag.startValue + delta / 100).toFixed(2)))
      triggerHaptic('change')
    }
  }, [props])

  const endDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handleSlider = useCallback((id: string, event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const next = valueFromPointer(event.clientX, rect)
    if (id === 'scrub-slider') props.onScrubChange(next)
    if (id === 'zoom-slider') props.onZoomChange(Number((0.55 + (next / 100) * 1.85).toFixed(2)))
    triggerHaptic('change')
  }, [props])

  const isActive = (id: string): boolean => {
    switch (id) {
      case 'filter-all':
        return props.sourceFilter === 'all' && !props.unresolvedOnly
      case 'filter-transit':
        return props.sourceFilter === 'transit'
      case 'filter-neocp':
        return props.sourceFilter === 'deep-space'
      case 'filter-unresolved':
        return props.unresolvedOnly
      case 'select-0':
      case 'select-1':
      case 'select-2':
      case 'select-3':
        return props.selectedIndex === Number(id.split('-')[1])
      case 'toggle-transit':
        return props.transitEnabled
      case 'toggle-neocp':
        return props.neocpEnabled
      case 'toggle-arm':
        return props.armed
      case 'toggle-highlight':
        return props.highlightStrong
      case 'toggle-auto':
        return props.autoAdvance
      default:
        return false
    }
  }

  const onControlActivate = (id: string) => {
    handlePress('change')
    switch (id) {
      case 'filter-all':
        props.onSourceFilter('all')
        return
      case 'filter-transit':
        props.onSourceFilter('transit')
        return
      case 'filter-neocp':
        props.onSourceFilter('deep-space')
        return
      case 'filter-unresolved':
        props.onToggleUnresolved()
        return
      case 'select-0':
      case 'select-1':
      case 'select-2':
      case 'select-3':
        props.onSelectIndex(Number(id.split('-')[1]))
        return
      case 'arm-inspector':
        props.onOpenInspector()
        return
      case 'toggle-transit':
        props.onToggleTransit()
        return
      case 'toggle-neocp':
        props.onToggleNeocp()
        return
      case 'toggle-arm':
        props.onToggleArmed()
        return
      case 'toggle-snooze':
      case 'snooze-ping':
        props.onSnoozePing()
        return
      case 'toggle-highlight':
        props.onToggleHighlight()
        return
      case 'toggle-auto':
        props.onToggleAutoAdvance()
        return
      case 'gain-knob':
      case 'gain-fine-0':
      case 'gain-fine-1':
      case 'gain-fine-2':
      case 'gain-fine-3':
      case 'zoom-dial':
        return
      default:
        return
    }
  }

  return (
    <div className={styles.layer} data-testid="instrument-hub-controls">
      {CHROME_CONTROLS.map(control => {
        const active = isActive(control.id)
        const className = [
          styles.control,
          styles[`kind_${control.kind}`],
          active ? styles.active : '',
        ].filter(Boolean).join(' ')

        if (control.kind === 'slider-h') {
          const value = control.id === 'scrub-slider' ? props.scrub : ((props.zoom - 0.55) / 1.85) * 100
          return (
            <div
              key={control.id}
              className={className}
              style={{ left: pct(control.left), top: pct(control.top), width: pct(control.width), height: pct(control.height) }}
              data-testid={`instrument-control-${control.id}`}
              aria-label={control.label}
              onPointerDown={event => {
                handlePress('press')
                handleSlider(control.id, event)
              }}
              onPointerMove={event => {
                if (event.buttons !== 1) return
                handleSlider(control.id, event)
              }}
            >
              <span className={styles.sliderTrack} />
              <span className={styles.sliderThumb} style={{ left: pct(value) }} />
            </div>
          )
        }

        if (control.kind === 'knob' || control.kind === 'dial') {
          const startValue = control.id === 'zoom-dial' ? props.zoom : props.gain
          return (
            <button
              key={control.id}
              type="button"
              className={className}
              style={{ left: pct(control.left), top: pct(control.top), width: pct(control.width), height: pct(control.height) }}
              data-testid={`instrument-control-${control.id}`}
              aria-label={control.label}
              onPointerDown={event => startDrag(control.id, startValue, event)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span
                className={control.kind === 'dial' ? styles.dialNeedle : styles.knobCap}
                style={{ transform: `rotate(${(startValue / (control.kind === 'dial' ? 2.4 : 100)) * 240 - 120}deg)` }}
              />
            </button>
          )
        }

        if (control.kind === 'grid') {
          return (
            <div
              key={control.id}
              className={className}
              style={{ left: pct(control.left), top: pct(control.top), width: pct(control.width), height: pct(control.height) }}
              data-testid={`instrument-control-${control.id}`}
              role="group"
              aria-label={control.label}
            >
              {Array.from({ length: Math.min(8, Math.max(props.visibleCount, 1)) }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.matrixCell}${props.selectedIndex === index ? ` ${styles.active}` : ''}`}
                  aria-label={`Select signal ${index + 1}`}
                  onClick={() => {
                    handlePress('change')
                    props.onSelectIndex(index)
                  }}
                />
              ))}
            </div>
          )
        }

        return (
          <button
            key={control.id}
            type="button"
            className={className}
            style={{ left: pct(control.left), top: pct(control.top), width: pct(control.width), height: pct(control.height) }}
            data-testid={`instrument-control-${control.id}`}
            aria-label={control.label}
            aria-pressed={active}
            onClick={() => {
              handlePress('press')
              onControlActivate(control.id)
            }}
          />
        )
      })}
    </div>
  )
}
