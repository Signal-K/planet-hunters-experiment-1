import { expect, test } from '@playwright/test'
import { checkClipping, checkContrast, checkGameplayVisible, collectStructural } from './checks'

// Proves the checkers fire: a page with a known overlap, tiny text, low contrast and clipped text must be REPORTED,
// and a clean page must report nothing. A checker that cannot fail is not evidence.
test.use({ viewport: { width: 390, height: 844 } })

const BAD = `<body style="margin:0;background:#fff">
<button style="position:absolute;left:20px;top:20px;width:120px;height:50px">Alpha</button>
<button style="position:absolute;left:60px;top:30px;width:120px;height:30px">Beta</button>
<p id="tiny" style="position:absolute;top:200px;font-size:9px">tiny words</p>
<p id="low" style="position:absolute;top:240px;font-size:16px;color:#bbb;background:#fff">pale gray on white</p>
<div id="clip" style="position:absolute;top:300px;width:60px;height:20px;overflow:hidden;white-space:nowrap;font-size:16px">this text is far too long for its box</div>
<div data-scene></div></body>`

const GOOD = `<body style="margin:0;background:#102030;color:#fff">
<button style="position:absolute;left:20px;top:20px;width:120px;height:50px;color:#fff;background:#003;font-size:16px">Alpha</button>
<button style="position:absolute;left:200px;top:20px;width:120px;height:50px;color:#fff;background:#003;font-size:16px">Beta</button>
<p style="position:absolute;top:200px;font-size:16px">readable words</p>
<div data-scene style="position:absolute;top:300px;width:200px;height:200px;background:linear-gradient(red,blue)"></div></body>`

test('checks report a known-bad page', async ({ page }) => {
  await page.setContent(BAD)
  const s = await collectStructural(page)
  await expect.poll(() => s.overlaps.length, 'overlap reported').toBeGreaterThan(0)
  expect(s.small.join()).toContain('tiny words')
  expect(s.taps.join()).toContain('Beta')
  const c = await checkContrast(page)
  expect(c.failures.join()).toContain('pale gray')
  const k = await checkClipping(page)
  expect(k.failures.join()).toContain('this text is far')
  const g = await checkGameplayVisible(page)
  expect(g.failures.join(), 'zero-size scene root').toContain('zero size')
})

test('checks stay quiet on a clean page', async ({ page }) => {
  await page.setContent(GOOD)
  const s = await collectStructural(page)
  expect(s.overlaps).toEqual([]); expect(s.small).toEqual([]); expect(s.taps).toEqual([])
  expect((await checkContrast(page)).failures).toEqual([])
  expect((await checkClipping(page)).failures).toEqual([])
  expect((await checkGameplayVisible(page)).failures).toEqual([])
})

test('contrast check records a skip reason over an image background', async ({ page }) => {
  await page.setContent(`<body><div style="background-image:linear-gradient(red,blue);padding:20px"><span style="color:#777;font-size:16px">on a gradient</span></div></body>`)
  const c = await checkContrast(page)
  expect(c.failures).toEqual([])
  expect(c.skipped.join()).toContain('background-image')
})

test('blank frame is reported', async ({ page }) => {
  await page.setContent(`<body style="margin:0;background:#000"><div data-scene style="width:100px;height:100px"></div></body>`)
  expect((await checkGameplayVisible(page)).failures.join()).toContain('blank')
})
