'use client'

import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

export interface LightcurvePoint { x: number; y: number }

interface LightcurvePlotProps {
  points: LightcurvePoint[]
  markers: number[]
  onMarker: (x: number) => void
  height?: number
}

// Synthetic fallback used when no real subject has loaded yet.
function makeFallbackPoints(): LightcurvePoint[] {
  const out: LightcurvePoint[] = []
  let seed = 1337
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  for (let i = 0; i < 200; i++) {
    const t = (i / 199) * 27.4
    const phase1 = ((t - 1.8) % 4.12 + 4.12) % 4.12
    const d1 = phase1 > 4.12 / 2 ? 4.12 - phase1 : phase1
    const dip = 0.027 * Math.exp(-0.5 * (d1 / 0.05) ** 2)
    const noise = (rnd() - 0.5) * 0.0004
    out.push({ x: Math.round(t * 1000) / 1000, y: Math.round((1.0 - dip + noise) * 100000) / 100000 })
  }
  return out
}

// Round to 3 decimal places so labels are readable
function fmt(n: number) { return n.toFixed(3) }

const Y_TICK_COUNT = 5

/**
 * SSL-301: a fixed 3-decimal formatter on an auto domain produced runs of
 * identical labels ("1.000, 1.000, 1.000") whenever the flux span was under a
 * few millimag. Compute the ticks ourselves and pick the smallest precision
 * (3..6 dp) at which every label is distinct, so the axis always reads as a
 * real scale.
 */
export function lightcurveYTicks(data: LightcurvePoint[], count = Y_TICK_COUNT): { ticks: number[]; decimals: number } {
  if (data.length === 0) return { ticks: [], decimals: 3 }
  let min = Infinity
  let max = -Infinity
  for (const point of data) {
    if (point.y < min) min = point.y
    if (point.y > max) max = point.y
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [], decimals: 3 }
  if (max - min < 1e-9) {
    const pad = Math.max(1e-4, Math.abs(min) * 1e-4)
    min -= pad
    max += pad
  }
  const ticks = Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1))
  for (let decimals = 3; decimals <= 6; decimals++) {
    const labels = new Set(ticks.map(tick => tick.toFixed(decimals)))
    if (labels.size === ticks.length) return { ticks, decimals }
  }
  return { ticks, decimals: 6 }
}

export default function LightcurvePlot({ points, markers, onMarker, height = 190 }: LightcurvePlotProps) {
  const data = useMemo(() => (points.length > 0 ? points : makeFallbackPoints()), [points])
  const yAxis = useMemo(() => lightcurveYTicks(data), [data])
  const fmtY = (value: number) => value.toFixed(yAxis.decimals)

  function handleClick(chartData: { activeLabel?: string | number } | null) {
    if (chartData?.activeLabel == null) return
    const x = Number(chartData.activeLabel)
    if (isNaN(x)) return

    // If clicking within 0.4 days of an existing marker, remove it
    const near = markers.find(m => Math.abs(m - x) < 0.4)
    if (near !== undefined) {
      // Signal removal: use a tiny negative epsilon when near===0 to avoid
      // -0, which JS treats as non-negative (-0 < 0 === false).
      onMarker(near === 0 ? -Number.EPSILON : -near)
      return
    }
    onMarker(x)
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 16, left: 0 }}
          onClick={handleClick}
          style={{ cursor: 'crosshair' }}
        >
          <CartesianGrid stroke="rgba(112,217,234,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontFamily: 'var(--ln-font-mono)', fontSize: 8, fill: '#5d7390' }}
            label={{ value: 'Time (days)', position: 'insideBottom', offset: -8, fontFamily: 'var(--ln-font-mono)', fontSize: 8, fill: '#5d7390' }}
          />
          <YAxis
            domain={yAxis.ticks.length > 0 ? [yAxis.ticks[0], yAxis.ticks[yAxis.ticks.length - 1]] : ['auto', 'auto']}
            ticks={yAxis.ticks.length > 0 ? yAxis.ticks : undefined}
            tick={{ fontFamily: 'var(--ln-font-mono)', fontSize: 8, fill: '#5d7390' }}
            width={yAxis.decimals > 4 ? 58 : 46}
            tickFormatter={v => fmtY(Number(v))}
          />
          <Tooltip
            contentStyle={{ background: '#0a121d', border: '1px solid rgba(112,217,234,0.3)', borderRadius: 6, fontFamily: 'var(--ln-font-mono)', fontSize: 9 }}
            labelStyle={{ color: '#7ec8ff' }}
            itemStyle={{ color: '#f5a623' }}
            labelFormatter={v => `t = ${Number(v).toFixed(2)} d`}
            formatter={(v) => [fmt(Number(v)), 'Flux']}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#3fa9ff"
            strokeWidth={1.2}
            dot={false}
            activeDot={{ r: 3, fill: '#f5a623' }}
            isAnimationActive={false}
          />
          {markers.map(x => (
            <ReferenceLine
              key={x}
              x={x}
              stroke="#f5a623"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: `▼`, position: 'top', fill: '#f5a623', fontSize: 9, fontFamily: 'var(--ln-font-mono)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
