'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentStandbyViewport, InstrumentToolButton } from '@/components/game/instrument-viewport/InstrumentViewport'
import viewportStyles from '@/components/game/instrument-viewport/InstrumentViewport.module.css'
import type { Player } from '@/lib/game-types'
import { fetchQueuedRadioSubjects, type RadioMeteorBox, type RadioMeteorClassification, type RadioMeteorSubject } from '@/lib/radio-meteors'
import styles from './RadioMeteorScreen.module.css'

interface RadioMeteorScreenProps {
  player: Player
  onBack: () => void
  onSubmit: (classification: RadioMeteorClassification) => void
}

/** A tap (no drag) drops a box this size, in source pixels: about one meteor echo on a BRAMS spectrogram. */
const TAP_BOX = { width: 26, height: 64 }
/** Drags smaller than this count as a tap. */
const MIN_DRAG = 8

type Draft = { x0: number; y0: number; x1: number; y1: number }

const toBox = (d: Draft): RadioMeteorBox => ({
  x: Math.round(Math.min(d.x0, d.x1)),
  y: Math.round(Math.min(d.y0, d.y1)),
  width: Math.round(Math.abs(d.x1 - d.x0)),
  height: Math.round(Math.abs(d.y1 - d.y0)),
})

export default function RadioMeteorScreen({ player, onBack, onSubmit }: RadioMeteorScreenProps) {
  const done = player.radioMeteorClassifications ?? {}
  const [queue, setQueue] = useState<RadioMeteorSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [boxes, setBoxes] = useState<RadioMeteorBox[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchQueuedRadioSubjects(player.radioMeteorClassifications ?? {})
      .then(list => { if (!cancelled) { setQueue(list); setFailed(false) } })
      .catch(() => { if (!cancelled) setFailed(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Refetch only on entry; a submission advances the local queue instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subject = queue[0] ?? null
  useEffect(() => { setBoxes([]); setSelected(null); setDraft(null); setSize(null) }, [subject?.id])

  const total = Object.keys(done).length

  if (loading || failed || !subject) {
    return (
      <InstrumentStandbyViewport
        testId="radio-meteor-standby"
        sceneClassName="ln-scene-asteroid-discovery"
        eyebrow="RADIO METEOR ZOO · BRAMS"
        title="Meteor radio"
        onBack={onBack}
        status={loading ? 'ACQUIRING' : failed ? 'NO SIGNAL' : 'QUEUE EMPTY'}
        messageTitle={loading ? 'Tuning in' : failed ? 'Could not reach the radio archive' : 'Nothing left to check'}
        messageBody={loading ? 'Pulling a recording from the Belgian radio meteor network.' : failed ? 'Check the connection and come back.' : 'Every recording in this batch has been checked. More arrive as the network uploads them.'}
      />
    )
  }

  const point = (e: PointerEvent<SVGSVGElement>) => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: Math.max(0, Math.min(size?.w ?? 0, p.x)), y: Math.max(0, Math.min(size?.h ?? 0, p.y)) }
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !size) return
    const p = point(e)
    if (!p) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setSelected(null)
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const p = point(e)
    if (p) setDraft({ ...draft, x1: p.x, y1: p.y })
  }
  const up = () => {
    if (!draft || !size) return
    const dragged = Math.abs(draft.x1 - draft.x0) >= MIN_DRAG || Math.abs(draft.y1 - draft.y0) >= MIN_DRAG
    const box = dragged ? toBox(draft) : {
      x: Math.round(Math.max(0, Math.min(size.w - TAP_BOX.width, draft.x0 - TAP_BOX.width / 2))),
      y: Math.round(Math.max(0, Math.min(size.h - TAP_BOX.height, draft.y0 - TAP_BOX.height / 2))),
      ...TAP_BOX,
    }
    setDraft(null)
    setBoxes(prev => [...prev, box])
    setSelected(boxes.length)
  }

  const submit = (list: RadioMeteorBox[]) => {
    if (!size) return
    onSubmit({
      subjectId: subject.id,
      workflowId: subject.workflowId,
      imageUrl: subject.imageUrl,
      filename: subject.filename,
      imageWidth: size.w,
      imageHeight: size.h,
      boxes: list,
      submittedAt: Date.now(),
    })
    setQueue(prev => prev.slice(1))
  }

  const draftBox = draft ? toBox(draft) : null

  return (
    <InstrumentViewport
      testId="radio-meteor-screen"
      sceneClassName="ln-scene-asteroid-discovery"
      eyebrow={`RADIO METEOR ZOO · BRAMS ${subject.station.toUpperCase()} · ${subject.workflowName.toUpperCase()}`}
      title={subject.recordedAt ?? subject.filename}
      onBack={onBack}
      status={`ECHOES ${boxes.length} · CHECKED ${total}`}
      caption={(
        <p className={viewportStyles.caption} data-testid="radio-question">
          Box every meteor: the short upright marks crossing the bright line. The long curves are aircraft.
        </p>
      )}
      viewport={(
        <div className={styles.frame} style={size ? { aspectRatio: `${size.w} / ${size.h}` } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.image}
            data-testid="radio-spectrogram"
            src={subject.imageUrl}
            alt={`Radio spectrogram ${subject.filename}`}
            crossOrigin="anonymous"
            onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          {size && (
            <svg
              ref={svgRef}
              className={styles.draw}
              data-testid="radio-draw"
              viewBox={`0 0 ${size.w} ${size.h}`}
              preserveAspectRatio="none"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => setDraft(null)}
            >
              {boxes.map((b, i) => (
                <rect
                  key={i}
                  className={styles.box}
                  data-selected={selected === i || undefined}
                  data-testid={`radio-box-${i}`}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={e => { e.stopPropagation(); setSelected(i) }}
                />
              ))}
              {draftBox && <rect className={styles.draft} {...draftBox} vectorEffect="non-scaling-stroke" />}
            </svg>
          )}
        </div>
      )}
      answers={(
        <InstrumentAnswerRow
          actions={[
            { id: 'none', label: 'No meteors', testId: 'radio-no-meteors', disabled: boxes.length > 0, onClick: () => submit([]) },
            { id: 'submit', label: 'Submit', testId: 'radio-submit', disabled: boxes.length === 0, onClick: () => submit(boxes) },
          ]}
        />
      )}
      tool={(
        <InstrumentToolButton
          testId="radio-delete-box"
          label={selected != null ? 'Delete box' : 'Undo box'}
          pressed={false}
          disabled={boxes.length === 0}
          onClick={() => {
            setBoxes(prev => prev.filter((_, i) => i !== (selected ?? prev.length - 1)))
            setSelected(null)
          }}
        />
      )}
    />
  )
}
