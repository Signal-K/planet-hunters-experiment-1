import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadContext, scrapeInterfaceKeys, validateDocument } from './validate.ts'

const root = resolve(process.cwd(), '..')
const context = loadContext(root, new Set(['sandbox-hub', 'sandbox-transit']))

const scene = (extra: string) => `#:schema ../schema/scene.schema.json
format = 1
id = "demo"
type = "base"
name = "Demo"

[runtime]
surface = "canvas"

[preview]
route = "hub"
state = "sandbox-hub"

${extra}
`

const messages = (text: string, file = 'shared/authoring/scenes/demo.toml') =>
  validateDocument(text, file, context).diagnostics.map(d => `${d.severity}:${d.code}:${d.message}`)

describe('game state keys', () => {
  it('are read from the game source', () => {
    const player = scrapeInterfaceKeys(root, 'Player')!
    const state = scrapeInterfaceKeys(root, 'GameState')!
    expect(player.has('placed')).toBe(true)
    expect(player.has('transitStartedAt')).toBe(true)
    expect(state.has('targetId')).toBe(true)
    expect(state.has('player')).toBe(true)
    expect(player.has('PlayerLocation')).toBe(false)
  })
})

describe('things', () => {
  it('accepts a thing whose state names real fields', () => {
    expect(messages(scene(`[[things]]\nid = "hangar"\nlabel = "Hangar"\nstate = { targetId = "eros", player = { placed = ["hangar"] } }`))).toEqual([])
  })

  it('names the likely field when a player key is mistyped', () => {
    const found = messages(scene(`[[things]]\nid = "hangar"\nlabel = "Hangar"\nstate = { player = { placd = ["hangar"] } }`))
    expect(found).toEqual(['error:state-key:the player has no "placd" (did you mean "placed"?)'])
  })

  it('names the likely field when a top-level key is mistyped', () => {
    expect(messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nstate = { targetid = "eros" }`))).toEqual(['error:state-key:the game state has no "targetid" (did you mean "targetId"?)'])
  })

  it('rejects a thing id used twice and a choice with two defaults', () => {
    const found = messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nexclusive = "x"\ndefault = true\nquery = { time = "dawn" }\n\n[[things]]\nid = "a"\nlabel = "A again"\nexclusive = "x"\ndefault = true\nquery = { time = "dusk" }`))
    expect(found.some(m => m.startsWith('error:duplicate-id:'))).toBe(true)
    expect(found.some(m => m.startsWith('error:choice-defaults:'))).toBe(true)
  })

  it('warns about a loose thing that does nothing, but lets a choice member be the baseline', () => {
    expect(messages(scene(`[[things]]\nid = "a"\nlabel = "A"\n`))).toEqual(['warning:thing-empty:"a" has no state or query, so switching it on changes nothing'])
    const choice = messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nexclusive = "x"\ndefault = true\n\n[[things]]\nid = "b"\nlabel = "B"\nexclusive = "x"\nquery = { time = "dusk" }`))
    expect(choice).toEqual([])
  })

  it('warns about a choice with one member', () => {
    expect(messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nexclusive = "x"\nquery = { time = "dusk" }`)).some(m => m.startsWith('warning:choice-alone:'))).toBe(true)
  })

  it('checks sliders: a sensible range, a start inside it, and something for the value to do', () => {
    const ok = `[[things]]\nid = "t"\nlabel = "T"\nrange = { min = 0, max = 60, value = 20 }\nstate = { player = { transitStartedAt = "@now-{value}m" } }`
    expect(messages(scene(ok))).toEqual([])
    expect(messages(scene(ok.replace('value = 20', 'value = 90')))).toEqual(['error:range:90 is outside 0 to 60'])
    expect(messages(scene(ok.replace('min = 0, max = 60', 'min = 60, max = 0')))).toContain('error:range:min must be below max')
    expect(messages(scene(ok.replace('"@now-{value}m"', '"@now"')))).toEqual(['warning:slider-unused:a slider needs {value} or {rest} somewhere in its state, or it changes nothing'])
  })

  it('only allows the stage switches that exist', () => {
    expect(messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nquery = { time = "midnight" }`))[0]).toMatch(/^error:enum:must be one of: dawn, morning, midday, afternoon, dusk, night/)
    expect(messages(scene(`[[things]]\nid = "a"\nlabel = "A"\nquery = { wether = "rain" }`))[0]).toMatch(/^error:unknown-key:unknown key "wether"/)
  })
})

describe('presets', () => {
  const things = `[[things]]\nid = "a"\nlabel = "A"\nquery = { time = "dawn" }\n\n[[things]]\nid = "t"\nlabel = "T"\nrange = { min = 0, max = 60, value = 20 }\nstate = { player = { transitStartedAt = "@now-{value}m" } }\n\n`

  it('accepts a preset that names real things and sliders', () => {
    expect(messages(scene(`${things}[[presets]]\nid = "p"\nname = "P"\nthings = ["a"]\nvalues = { t = 30 }\ninstructions = """\nCheck it.\n"""`))).toEqual([])
  })

  it('points at the likely thing when one is mistyped, and refuses a slider in the list', () => {
    const found = messages(scene(`${things}[[presets]]\nid = "p"\nname = "P"\nthings = ["aa", "t"]`))
    expect(found).toContain('error:preset-thing:"aa" is not a thing in this scene (did you mean "a"?)')
    expect(found).toContain('error:preset-thing:"t" is a slider; set it under values')
  })

  it('refuses a value for something that is not a slider, or outside its range', () => {
    const found = messages(scene(`${things}[[presets]]\nid = "p"\nname = "P"\nvalues = { a = 1, t = 99 }`))
    expect(found).toContain('error:preset-value:"a" is not a slider in this scene')
    expect(found).toContain('error:preset-value:99 is outside 0 to 60')
  })

  it('rejects a preset id used twice', () => {
    expect(messages(scene(`[[presets]]\nid = "p"\nname = "P"\n\n[[presets]]\nid = "p"\nname = "Q"`))).toEqual(['error:duplicate-id:preset id "p" is already used by preset 1'])
  })
})

describe('flows', () => {
  const flow = (steps: string) => `#:schema ../schema/flow.schema.json\nformat = 1\nid = "demo"\nname = "Demo"\n\n${steps}\n`
  const file = 'shared/authoring/flows/demo.toml'

  it('accepts steps that name a real scene and one of its presets', () => {
    expect(messages(flow(`[[steps]]\nscene = "hub"\npreset = "fresh-base"\ntitle = "Start"`), file)).toEqual([])
    expect(messages(flow(`[[steps]]\nscene = "hub"\ntitle = "Start"`), file)).toEqual([])
  })

  it('refuses a scene that does not exist', () => {
    expect(messages(flow(`[[steps]]\nscene = "nowhere"\ntitle = "Start"`), file)).toEqual(['error:flow-scene:no scene script for "nowhere"'])
  })

  it('names the likely preset when one is mistyped', () => {
    expect(messages(flow(`[[steps]]\nscene = "hub"\npreset = "fresh-bas"\ntitle = "Start"`), file)).toEqual(['error:flow-preset:hub has no preset "fresh-bas" (did you mean "fresh-base"?)'])
  })

  it('needs at least one step and a name matching the file', () => {
    expect(messages(`format = 1\nid = "demo"\nname = "Demo"\nsteps = []\n`, file)).toContain('error:min-items:needs at least 1 items')
    expect(messages(flow(`[[steps]]\nscene = "hub"\ntitle = "x"`).replace('id = "demo"', 'id = "other"'), file)).toContain('error:id-file:id "other" must match the file name "demo"')
  })
})
