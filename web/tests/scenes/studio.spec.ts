import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { VIEWPORTS } from './helpers'

// SSL-641: the Scene Studio. Every scene as a script you can see, edit and preview in the real game with no login.
// Writes go to a throwaway scene (zz-e2e); the one real file it edits (a mission) is restored afterwards.
const OUT = process.env.SNAPSHOT_DIR ?? 'test-results/studio'
const REPO = resolve(process.cwd(), '..')
const AUTHORING = join(REPO, 'shared/authoring')
const SCENE = 'zz-e2e'
const sceneFile = join(AUTHORING, `scenes/${SCENE}.toml`)
const feedbackFile = join(AUTHORING, `feedback/${SCENE}.toml`)
const MISSION = join(AUTHORING, 'missions/free-mining.toml')
const COMPILED = [join(REPO, 'shared/missions/authored-missions.json'), join(REPO, 'web/lib/data/authored-missions.json'), join(REPO, 'native/LandnamCore/Sources/LandnamCore/Data/AuthoredMissions.generated.swift')]
const originals = new Map<string, string>()

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const read = (file: string) => readFileSync(file, 'utf8')

function cleanup() {
  for (const file of [sceneFile, feedbackFile, join(AUTHORING, `instructions/scenes/${SCENE}.md`), join(AUTHORING, `instructions/scenes/${SCENE}.next.md`)]) if (existsSync(file)) rmSync(file)
  const refs = join(AUTHORING, 'feedback/refs')
  if (existsSync(refs)) for (const name of readdirSync(refs)) if (name.startsWith(`${SCENE}-`)) rmSync(join(refs, name))
  for (const [file, text] of originals) if (existsSync(file) && read(file) !== text) writeFileSync(file, text)
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.beforeAll(() => {
  for (const file of [MISSION, ...COMPILED]) originals.set(file, read(file))
  cleanup()
  writeFileSync(sceneFile, read(join(AUTHORING, 'scenes/launchpad.toml')).replace('id = "launchpad"', `id = "${SCENE}"`).replace('name = "Launchpad"', 'name = "E2E scene"').replace(/^qa = .*\n/m, ''))
})
test.afterAll(() => cleanup())

async function openStudio(page: Page, query: string) {
  // A real note also posts a comment for any agent watching the storyboard thread; tests must not message agents.
  await page.route('**/game/storyboard/comments', route => (route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.continue()))
  await page.goto(`/game/studio?${query}`, { timeout: 90_000 })
  await expect(page.getByTestId('studio')).toBeVisible({ timeout: 60_000 })
}

for (const [name, size] of [...Object.entries(VIEWPORTS), ['half-window', { width: 640, height: 900 }], ['cursor-window', { width: 681, height: 669 }]] as const) {
  test(`studio fits ${name} with the real game inside and the note box in reach`, async ({ page }) => {
    await page.setViewportSize(size)
    const device = name === 'landscape' ? 'ls' : name === 'desktop' ? 'dk' : 'ph'
    await openStudio(page, `scene=${SCENE}&vp=${device}`)
    expect(await page.evaluate(() => innerWidth)).toBe(size.width)
    const frame = page.getByTestId('studio-web-frame')
    await expect(frame).toBeVisible({ timeout: 60_000 })
    await expect(frame).toHaveAttribute('src', /\/game\/stage\?preset=sandbox%3A/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const preview = await page.getByTestId('studio-preview-area').boundingBox()
    const tools = await page.getByTestId('studio-tools').boundingBox()
    expect(preview).not.toBeNull()
    expect(tools).not.toBeNull()
    expect(preview!.width).toBeGreaterThanOrEqual(size.width - 2)
    expect(tools!.y).toBeGreaterThanOrEqual(preview!.y + preview!.height - 1)
    const studio = page.getByTestId('studio')
    expect(await studio.evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight, overflow: getComputedStyle(el).overflowY }))).toMatchObject({ client: size.height, overflow: 'auto' })
    expect(await studio.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${OUT}/studio-${name}.png` })
    await studio.evaluate(el => el.scrollTo({ top: el.scrollHeight }))
    await expect(page.getByTestId('studio-tools')).toBeInViewport()
    await page.getByRole('tab', { name: /Objects/ }).click()
    await expect(page.getByTestId('studio-tree')).toBeVisible()
    await expect(page.getByTestId('composition-density')).toBeVisible()
    await page.screenshot({ path: `${OUT}/studio-${name}-editor.png` })
    await page.getByRole('tab', { name: /Notes/ }).click()
    await expect(page.getByTestId('note-input')).toBeVisible()
    // text never drops under the 14px floor
    const smallest = await page.evaluate(() => Math.min(...[...document.querySelectorAll('[data-testid=studio] *')].filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim())).map(el => parseFloat(getComputedStyle(el).fontSize))))
    expect(smallest).toBeGreaterThanOrEqual(14)
  })
}

test('the scene picker lists every scene and opens one', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop)
  await openStudio(page, 'scene=hub&vp=ph')
  await page.keyboard.press('Control+k')
  const list = page.getByTestId('scene-list')
  await expect(list).toBeVisible()
  expect(await list.locator('[data-testid^="scene-"]:not([data-testid="scene-list"]):not([data-testid="scene-picker"]):not([data-testid="scene-filter"])').count()).toBeGreaterThanOrEqual(27)
  await page.getByTestId('scene-filter').fill('hangar')
  await page.getByTestId('scene-hangar').click()
  await expect(page.getByTestId('scene-picker')).toContainText('Hangar')
  await expect(page).toHaveURL(/scene=hangar/)
  await expect(page.getByTestId('preset-select').locator('option')).not.toHaveCount(0)
})

test('a note becomes file content, can be pinned, marked fixed, turned into a brief and deleted', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.setViewportSize({ width: 640, height: 900 })
  await openStudio(page, `scene=${SCENE}&vp=ph`)
  await page.getByRole('tab', { name: /Notes/ }).click()
  await page.getByTestId('note-input').fill('The launch button looks like a website button')
  await page.getByTestId('add-note').click()
  await expect(page.getByTestId('notes-list').locator('textarea')).toHaveCount(1)
  expect(read(feedbackFile)).toContain('note = "The launch button looks like a website button"')

  await page.getByTestId('note-input').fill('The pad is right')
  await page.getByTestId('kind-keep').click()
  await page.getByTestId('pin-tool').click()
  const layer = await page.getByTestId('studio-pin-layer').boundingBox()
  await page.mouse.click(layer!.x + layer!.width * 0.5, layer!.y + layer!.height * 0.6)
  await expect(page.getByTestId('notes-list').locator('textarea')).toHaveCount(2)
  expect(read(feedbackFile)).toMatch(/kind = "keep"\nnote = "The pad is right"\nat = \{ x = 0\.5/)

  await page.getByRole('button', { name: 'Mark wrong note 1 fixed' }).click()
  await expect.poll(() => read(feedbackFile)).toContain('resolved = true')
  await page.getByTestId('mode-explore').click()
  await expect.poll(() => read(feedbackFile)).toContain('mode = "explore"')

  await page.getByTestId('copy-prompt').click()
  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toContain(`Work on the Landnam scene "${SCENE}"`)
  expect(brief).toContain('Mode explore:')
  expect(brief).toMatch(/The launch button looks like a website button \[[^\]]*\] \(resolved\)/)
  expect(brief).toContain('Keep (do not touch):')
  await page.screenshot({ path: `${OUT}/studio-notes.png` })

  await page.getByRole('button', { name: 'Delete wrong note 1' }).click()
  await expect.poll(() => read(feedbackFile)).not.toContain('The launch button looks like a website button')
})

test('inspiration: a chosen screenshot is shrunk, stored and listed', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await openStudio(page, `scene=${SCENE}&vp=ph`)
  await page.getByRole('tab', { name: /Notes/ }).click()
  await page.getByTestId('inspiration-summary').click()
  await page.getByTestId('inspo-source').fill('Dorfromantik')
  await page.getByTestId('inspo-likes').fill('soft shadows and the way pieces click into place')
  await page.locator('input[type=file]').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByTestId('pending-ref')).toBeVisible()
  await page.getByTestId('inspo-add').click()
  await expect.poll(() => (existsSync(feedbackFile) ? read(feedbackFile) : '')).toContain('source = "Dorfromantik"')
  expect(existsSync(join(AUTHORING, `feedback/refs/${SCENE}-1.jpg`))).toBe(true)
  expect(read(feedbackFile)).toContain(`image = "${SCENE}-1.jpg"`)
  await expect(page.locator('img[src*="/api/dev/studio/ref"]')).toBeVisible()
})

test('edit mode: draw an element, move it, undo, and see a mistake with its line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openStudio(page, `scene=${SCENE}&vp=ph&mode=edit`)
  await page.getByTestId('tool-draw').click()
  const area = await page.getByTestId('studio-overlay').boundingBox()
  await page.mouse.move(area!.x + area!.width * 0.2, area!.y + area!.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(area!.x + area!.width * 0.5, area!.y + area!.height * 0.36, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('tree-ui-1')).toBeVisible()
  const drawn = read(sceneFile)
  expect(drawn).toMatch(/id = "ui-1"\nkind = "ui"\nrect = \{ x = 0\.2, y = 0\.3, w = 0\.3, h = 0\.06[0-9]* \}\nstatus = "proposed"/)

  const box = await page.getByTestId('obj-ui-1').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 30, box!.y + box!.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => read(sceneFile)).not.toContain('x = 0.2,')
  const moved = read(sceneFile)
  await page.getByTestId('undo').click()
  await expect.poll(() => read(sceneFile)).toBe(drawn)
  expect(moved).not.toBe(drawn)

  // a mistake in the file is shown with its line in the source
  writeFileSync(sceneFile, `${read(sceneFile)}\n[[objects]]\nid = "oops"\nkind = "ui"\nslott = "hud"\n`)
  await expect(page.getByTestId('source-details')).toHaveAttribute('open', '', { timeout: 15_000 })
  const diagnostic = page.getByTestId('diagnostic').first()
  await expect(diagnostic).toContainText('unknown key "slott" (did you mean "slot"?)')
  await page.screenshot({ path: `${OUT}/studio-edit.png`, fullPage: true })
})

test('editing a mission in the Studio recompiles what web and native both read, and undo puts it back', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop)
  await openStudio(page, 'data=mission:free-mining')
  const original = read(MISSION)
  await page.getByTestId('studio-tree').getByText('requires', { exact: false }).first().click()
  const cargo = page.getByTestId('field-cargo_min')
  await expect(cargo).toBeVisible()
  await cargo.fill('3')
  await cargo.blur()
  await expect.poll(() => JSON.parse(read(COMPILED[0])).missions.find((m: { id: string }) => m.id === 'freeops-self-directed-mining').requires.cargo_min).toBe(3)
  const declared = JSON.parse(read(COMPILED[0]))
  expect(declared.missions.find((m: { id: string }) => m.id === 'freeops-self-directed-mining').requires.cargo_min).toBe(3)
  expect(read(COMPILED[1])).toBe(read(COMPILED[0]))
  expect(read(COMPILED[2])).toContain('"cargo_min": 3')
  expect(read(MISSION)).toContain('cargo_min = 3')
  await page.getByTestId('undo').click()
  await expect.poll(() => read(MISSION)).toBe(original)
  await expect.poll(() => read(COMPILED[2])).toContain('"cargo_min": 1')
})
