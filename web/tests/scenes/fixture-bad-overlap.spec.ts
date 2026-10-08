import { test } from '@playwright/test'
import { expectSound } from './helpers'

// SSL-505 controlled failure: tiny text and two overlapping buttons. Must turn CI red.
test('fixture: deliberate small text + overlap is caught', async ({ page }) => {
  await page.setContent(`<button style="position:absolute;left:10px;top:10px;width:120px;height:50px">A</button>
    <button style="position:absolute;left:40px;top:20px;width:120px;height:50px">B</button>
    <p style="font-size:11px">tiny</p>`)
  await expectSound(page, [])
})
