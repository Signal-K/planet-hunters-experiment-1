import type { RoverPart } from '@takeon/engine'
type Registry = { listRoverParts: () => RoverPart[]; registerRoverPart: (part: RoverPart) => void }
const installed = new WeakSet<Registry>()
/** A four-direction dimensional rover aligned with the field's 52-degree projection. */
export function installHighObliqueRover(engine: Registry): void {
  if (installed.has(engine)) return
  installed.add(engine)
  for (const part of engine.listRoverParts()) engine.registerRoverPart({ ...part, when: p => p.rover.spec.id === 'field-probe' && (part.when?.(p) ?? true) })
  engine.registerRoverPart({ id: 'landnam-high-oblique-rover', order: 50, when: p => p.rover.spec.id !== 'field-probe', draw(ctx, p) {
    // Undo the engine's sprite mirror; all four headings are projected here.
    ctx.scale(p.flip, 1)
    const angle = p.facing * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle)
    type Point = [number, number, number]
    const world = ([x,y,z]: Point): Point => [x*c-y*s,x*s+y*c,z]
    const project = ([x,y,z]: Point): [number,number] => [(x-y)*.707,(x+y)*(.707 * 25 / 32)-z*(10 / 16)]
    const poly = (points: Point[], color: string, stroke = '#34444a') => {
      ctx.beginPath(); points.map(project).forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath()
      ctx.fillStyle = color; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .55; ctx.stroke() }
    }
    const ground = (points: Point[], color: string) => poly(points.map(world), color, '')
    ground([[-13,-8,0],[-13,8,0],[13,8,0],[13,-8,0]], 'rgba(21,30,34,.22)')
    ground([[14,-1,0],[18,-1,0],[18,-2.5,0],[22,0,0],[18,2.5,0],[18,1,0],[14,1,0]], '#91f0e8')
    const faces: { points: Point[]; color: string; depth: number }[] = []
    const face = (points: Point[], color: string) => { const transformed = points.map(world); faces.push({ points: transformed, color, depth: transformed.reduce((v,q) => v+q[0]+q[1]+q[2]*.03,0)/points.length }) }
    for (const x of [-8,0,8]) for (const y of [-5.5,5.5]) {
      const wheel = Array.from({length:12}, (_,i): Point => { const t = i*Math.PI/6; return [x+Math.cos(t)*2.2,y,2.3+Math.sin(t)*2.2] })
      face(wheel, '#303b40'); face(wheel.map(([wx,wy,wz]) => [x+(wx-x)*.42,wy+(y<0?-.05:.05),2.3+(wz-2.3)*.42]), '#c58958')
    }
    // Suspension arms join each axle to a slim undercarriage.
    for (const x of [-8, 0, 8]) for (const y of [-1, 1]) {
      face([[x-1,y*3.8,3.5],[x+1,y*3.8,3.5],[x+.55,y*5.4,2.3],[x-.55,y*5.4,2.3]], '#59686a')
    }
    face([[-10,-3,1.8],[10,-3,1.8],[10,3,1.8],[-10,3,1.8]], '#35464b')
    face([[-11,-4,2],[11,-4,2],[11,-4,6],[-11,-4,6]], '#aab8b9')
    face([[-11,4,2],[11,4,2],[11,4,6],[-11,4,6]], '#899da1')
    face([[11,-4,2],[11,4,2],[11,4,6],[11,-4,6]], '#d57948')
    face([[-11,-4,2],[-11,4,2],[-11,4,6],[-11,-4,6]], '#71868a')
    face([[-11,-4,6],[11,-4,6],[11,4,6],[-11,4,6]], '#e6e3d5')
    // Separate orange end caps and small access hatches break up the hull.
    for (const y of [-4.02, 4.02]) {
      face([[-10,y,2.4],[-8.5,y,2.4],[-8.5,y,5.7],[-10,y,5.7]], '#d77a43')
      face([[2,y,2.4],[3.2,y,2.4],[3.2,y,5.7],[2,y,5.7]], '#d77a43')
      face([[-6.5,y,2.8],[-3,y,2.8],[-3,y,5],[-6.5,y,5]], '#d9ddcf')
      face([[-6,y*1.002,3.1],[-3.5,y*1.002,3.1],[-3.5,y*1.002,4.7],[-6,y*1.002,4.7]], '#aab9b6')
    }
    // Equipment follows the fitted rover spec, leaving room for future modules.
    face([[5,-3.5,6],[10,-3.5,6],[10,-3.5,8],[5,-3.5,8]], '#df7840')
    face([[5,3.5,6],[10,3.5,6],[10,3.5,8],[5,3.5,8]], '#bc633b')
    face([[5,-3.5,8],[10,-3.5,8],[10,3.5,8],[5,3.5,8]], '#e8e4d7')
    face([[7,-3.55,6.5],[9.5,-3.55,6.5],[9.5,-3.55,7.8],[7,-3.55,7.8]], '#31556b')
    face([[7,3.55,6.5],[9.5,3.55,6.5],[9.5,3.55,7.8],[7,3.55,7.8]], '#31556b')
    if (p.has.solar) {
      face([[-8,-3,6.15],[1,-3,6.15],[1,3,6.15],[-8,3,6.15]], '#31576a')
      for (const x of [-6,-4,-2,0]) face([[x,-2.8,6.2],[x+.12,-2.8,6.2],[x+.12,2.8,6.2],[x,2.8,6.2]], '#86aeb7')
    }
    if (p.has.tool) face([[-8,4.08,2.8],[-3,4.08,2.8],[-3,4.08,5.4],[-8,4.08,5.4]], '#d9d6c7')
    if (p.has.camera) face([[2,-2.5,6.2],[4,-2.5,6.2],[4,-.5,6.2],[2,-.5,6.2]], '#344d5a')
    if (p.load > 0) face([[-10,-2.5,6.2],[-8,-2.5,6.2],[-8,2.5,6.2],[-10,2.5,6.2]], '#be8c56')
    faces.sort((a,b) => a.depth-b.depth).forEach(f => poly(f.points,f.color))
    if (!p.has.scanner) return
    const [mx,my] = project(world([-5,0,6])), [tx,ty] = project(world([-5,0,11]))
    ctx.strokeStyle='#2b3d43'; ctx.lineWidth=.7; ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(tx,ty); ctx.stroke()
    ctx.fillStyle='#e9e5d5'; ctx.strokeStyle='#53666c'; ctx.lineWidth=.55
    ctx.beginPath(); ctx.ellipse(tx,ty-1,2.6,1.4,-.35,0,Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.fillStyle='#df884b'; ctx.beginPath(); ctx.arc(tx,ty-1,.55,0,Math.PI*2); ctx.fill()
  } })
}
