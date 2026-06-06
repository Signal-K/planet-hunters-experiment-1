'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer } from 'recharts'

interface LightcurvePlotProps {
  bodyId?: string
}

// Generate synthetic TESS-style lightcurve data
function generateLightcurveData() {
  const points = []
  for (let i = 0; i <= 100; i++) {
    const x = i
    // Dip at ~54% x-axis
    const dipCenter = 54
    const dipWidth = 8
    const distance = Math.abs(x - dipCenter)
    let flux = 1.0
    if (distance < dipWidth) {
      const normalised = distance / dipWidth
      flux = 1.0 - 0.018 * (1 - normalised * normalised)
    }
    // Add small noise
    flux += (Math.random() - 0.5) * 0.003
    points.push({ x, flux: Math.round(flux * 10000) / 10000 })
  }
  return points
}

const DATA = generateLightcurveData()

export default function LightcurvePlot({ bodyId }: LightcurvePlotProps) {
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DATA} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(63,169,255,0.1)" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            tick={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, fill: '#5d7390' }}
            label={{ value: 'Time (d)', position: 'insideBottom', offset: -2, fontFamily: 'var(--ln-font-mono)', fontSize: 9, fill: '#5d7390' }}
          />
          <YAxis
            tick={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, fill: '#5d7390' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ background: '#0a121d', border: '1px solid rgba(63,169,255,0.3)', borderRadius: 6, fontFamily: 'var(--ln-font-mono)', fontSize: 10 }}
            labelStyle={{ color: '#7ec8ff' }}
            itemStyle={{ color: '#f5a623' }}
          />
          <Line
            type="monotone"
            dataKey="flux"
            stroke="#3fa9ff"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#f5a623' }}
          />
          {/* Transit marker dot at dip */}
          <ReferenceDot x={54} y={DATA.find(d => d.x === 54)?.flux ?? 0.982} r={5} fill="#f5a623" stroke="#ffc25c" strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
