'use client'

import { useEffect, useRef } from 'react'
import styles from './FlightScene.module.css'

const CORE = 'w'
const MID = 'y'
const OUTER = 'o'

const FRAMES = [
  [
    '..o...',
    '.oyy..',
    'oyyyw.',
    'oyyyw.',
    '.oyy..',
    '..o...',
  ],
  [
    '.o....',
    'oyy...',
    'oyyyw.',
    'oyyyyw',
    'oyyyw.',
    '.oy...',
  ],
  [
    '..o...',
    '.oyyo.',
    'oyyyw.',
    'wyyyw.',
    '.oyy..',
    '..o...',
  ],
]

const BOOST = [
  [
    'o.....',
    'oyy...',
    'oyyyw.',
    'oyyyyw',
    'oyyyw.',
    'oyy...',
  ],
  [
    'oo....',
    'oyyy..',
    'oyyyyw',
    'wyyyyw',
    'oyyyyw',
    '.oyy..',
  ],
]

function read(canvas: HTMLCanvasElement, name: string): string {
  return getComputedStyle(canvas).getPropertyValue(name).trim()
}

export function FlightFlame({ boosting }: { boosting: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const boostingRef = useRef(boosting)
  boostingRef.current = boosting

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const colors = {
      [CORE]: read(canvas, '--flame-core'),
      [MID]: read(canvas, '--flame-mid'),
      [OUTER]: read(canvas, '--flame-outer'),
    }
    let frame = 0
    const draw = () => {
      const rows = (boostingRef.current ? BOOST : FRAMES)[frame % (boostingRef.current ? BOOST.length : FRAMES.length)]
      const w = rows[0].length
      const h = rows.length
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const cell = row[x]
          if (cell === '.') continue
          ctx.fillStyle = colors[cell as keyof typeof colors]
          ctx.fillRect(x, y, 1, 1)
        }
      })
    }
    draw()
    const id = window.setInterval(() => {
      frame += 1
      draw()
    }, 90)
    return () => window.clearInterval(id)
  }, [])

  return <canvas ref={ref} className={styles.flame} aria-hidden="true" />
}
