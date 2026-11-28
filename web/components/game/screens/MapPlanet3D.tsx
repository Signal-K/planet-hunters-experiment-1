'use client'

import { useEffect, useRef } from 'react'
import { loadOrbitPreview, gasGiantPoint, gasGiantRings } from '@/lib/takeon/solarOrbit'
import { solarBiomeColour, gasGiantColour } from '@/lib/takeon/solarBiomeColour'
import type { Ramp } from '@/lib/takeon/terrainColour'

/** A small WebGL globe built from Takeon's orbital samples. */
export default function MapPlanet3D({ targetId, colours, onReady }: { targetId: string; colours: readonly string[]; onReady: (ready: boolean) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const palette = colours.join(',')

  useEffect(() => {
    let cancelled = false
    let contextLost = false
    let frame = 0
    let gl: WebGLRenderingContext | null = null
    let program: WebGLProgram | null = null
    const buffers: WebGLBuffer[] = []
    const canvas = ref.current
    const onContextLost = () => { contextLost = true; cancelAnimationFrame(frame); onReady(false) }
    canvas?.addEventListener('webglcontextlost', onContextLost)
    async function start() {
      const orbit = await loadOrbitPreview(targetId)
      if (cancelled || !ref.current) return
      gl = ref.current.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
      if (!gl) return
      const context = gl
      const compile = (kind: number, source: string) => {
        const shader = context.createShader(kind)
        if (!shader) throw new Error('Unable to create planet shader')
        context.shaderSource(shader, source)
        context.compileShader(shader)
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) { context.deleteShader(shader); throw new Error('Unable to compile planet shader') }
        return shader
      }
      const vertex = compile(context.VERTEX_SHADER, `
        attribute vec3 position; attribute vec3 colour;
        uniform float angle; uniform float bodyScale; varying vec3 normal; varying vec3 surface;
        void main() {
          float c = cos(angle), s = sin(angle);
          vec3 p = vec3(position.x*c + position.z*s, position.y, -position.x*s + position.z*c);
          normal = normalize(p); surface = colour;
          gl_Position = vec4(p.xy * bodyScale, -p.z * .35, 1.0);
        }`)
      const fragment = compile(context.FRAGMENT_SHADER, `
        precision mediump float; varying vec3 normal; varying vec3 surface;
        void main() {
          vec3 n = normalize(normal); vec3 light = normalize(vec3(-.55, .6, .75));
          float diffuse = max(dot(n, light), 0.0);
          float rim = pow(1.0 - max(n.z, 0.0), 3.0);
          vec3 colour = surface * (.30 + .82 * diffuse) + vec3(.13, .19, .22) * rim;
          gl_FragColor = vec4(colour, 1.0);
        }`)
      program = context.createProgram()
      if (!program) throw new Error('Unable to create planet program')
      context.attachShader(program, vertex); context.attachShader(program, fragment); context.linkProgram(program)
      context.deleteShader(vertex); context.deleteShader(fragment)
      if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error('Unable to link planet program')
      const positions: number[] = [], coloursRGB: number[] = [], indices: number[] = []
      const gas = gasGiantColour(targetId, 0, 0) !== null
      const columns = gas ? 192 : 64, rows = gas ? 96 : 32
      const extent = Math.max(1, ...orbit.patch.map(sample => sample.radius))
      const ramp = palette.split(',') as unknown as Ramp
      for (let y = 0; y <= rows; y++) {
        const latitude = (y / rows - .5) * Math.PI
        for (let x = 0; x <= columns; x++) {
          const longitude = (x / columns * 2 - 1) * Math.PI
          // The available hemisphere is mirrored on the far side; the source
          // data and surface colours remain shared with the landing preview.
          const sx = Math.round((Math.asin(Math.sin(longitude)) / Math.PI + .5) * (orbit.width - 1))
          const sy = Math.round((latitude / Math.PI + .5) * (orbit.height - 1))
          const sample = orbit.patch[sy * orbit.width + sx]
          const relief = sample.radius / extent
          const p = gasGiantPoint(targetId, Math.cos(latitude) * Math.sin(longitude) * relief, Math.sin(latitude) * relief, Math.cos(latitude) * Math.cos(longitude) * relief)
          positions.push(p.x, p.y, p.z)
          const hex = (gasGiantColour(targetId, latitude, longitude) ?? solarBiomeColour(sample.biome, ramp)).slice(1)
          coloursRGB.push(...[0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255))
          if (x < columns && y < rows) {
            const i = y * (columns + 1) + x
            indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
          }
        }
      }
      for (const ring of gasGiantRings(targetId)) {
        for (let segment = 0; segment < 256; segment++) {
          const first = positions.length / 3
          for (const [r, a] of [[ring.inner, segment], [ring.outer, segment], [ring.inner, segment + 1], [ring.outer, segment + 1]]) {
            const theta = a / 256 * Math.PI * 2
            const p = gasGiantPoint(targetId, r * Math.cos(theta), 0, r * Math.sin(theta))
            positions.push(p.x, p.y, p.z)
            const hex = ring.colour.slice(1)
            coloursRGB.push(...[0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255))
          }
          indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
        }
      }
      const attribute = (name: string, values: number[]) => {
        const buffer = context.createBuffer()
        if (!buffer || !program) throw new Error('Unable to create planet mesh')
        buffers.push(buffer); context.bindBuffer(context.ARRAY_BUFFER, buffer)
        context.bufferData(context.ARRAY_BUFFER, new Float32Array(values), context.STATIC_DRAW)
        const location = context.getAttribLocation(program, name)
        context.enableVertexAttribArray(location); context.vertexAttribPointer(location, 3, context.FLOAT, false, 0, 0)
      }
      context.useProgram(program); attribute('position', positions); attribute('colour', coloursRGB)
      const index = context.createBuffer()
      if (!index) throw new Error('Unable to create planet indices')
      buffers.push(index); context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, index)
      context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), context.STATIC_DRAW)
      context.enable(context.DEPTH_TEST); context.clearColor(0, 0, 0, 0)
      const angle = context.getUniformLocation(program, 'angle')
      context.uniform1f(context.getUniformLocation(program, 'bodyScale'), targetId === 'saturn' ? .43 : .92)
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const draw = (time: number) => {
        if (cancelled || contextLost) return
        context.viewport(0, 0, context.drawingBufferWidth, context.drawingBufferHeight)
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)
        context.uniform1f(angle, still || gas ? 0 : time * .000025)
        context.drawElements(context.TRIANGLES, indices.length, context.UNSIGNED_SHORT, 0)
        if (!still && !gas) frame = requestAnimationFrame(draw)
      }
      draw(0); onReady(true)
    }
    void start().catch(error => { if (!cancelled) console.warn('3D map planet unavailable', error) })
    return () => {
      cancelled = true; cancelAnimationFrame(frame); canvas?.removeEventListener('webglcontextlost', onContextLost)
      if (gl) { for (const buffer of buffers) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program) }
    }
  }, [targetId, palette, onReady])

  return <canvas ref={ref} width={128} height={128} aria-hidden="true" style={{ position: 'absolute', inset: targetId === 'saturn' ? '-28%' : '-4%', width: targetId === 'saturn' ? '156%' : '108%', height: targetId === 'saturn' ? '156%' : '108%', pointerEvents: 'none' }} />
}
