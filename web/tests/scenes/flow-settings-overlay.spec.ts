import { expect, test } from '@playwright/test'
import { VIEWPORTS } from './helpers'

// Exercise the actual game shell and cog, with an offline authenticated save.
// Network requests are intercepted so this visual regression never touches a real account.
for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`settings overlay ${name}`, () => {
    test.use({ viewport })
    test('cog opens a full utility page; settings scroll and close', async ({ page }, info) => {
      const record = { id: 'e2euser0000001', collectionId: '_pb_users_auth_', collectionName: 'users', email: 'settings@example.test', verified: true }
      const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: record.id, exp: 4102444800 })}.sig`
      await page.route(/\/api\/(collections|realtime|health)/, route =>
        /auth-refresh/.test(route.request().url())
          ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token, record }) })
          : route.abort('connectionrefused'))
      await page.addInitScript(({ token, record }) => {
        localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record }))
        localStorage.setItem('landnam-game-state-v1:user:e2euser0000001', JSON.stringify({ screen: 'hub', player: { placed: ['launchpad'], missionsDone: 1, flightPlan: { completed: { mining: true }, hidden: true } } }))
      }, { token, record })
      await page.goto('/game')
      await page.getByTestId('hub-btn').click()
      await page.getByTestId('base-menu-settings').click()
      const sheet = page.getByTestId('settings-sheet')
      await expect(sheet).toBeVisible()
      expect(await page.evaluate(() => ({ width: innerWidth, landscape: matchMedia('(orientation: landscape)').matches }))).toEqual({ width: viewport.width, landscape: viewport.width > viewport.height })
      const geometry = await sheet.evaluate(el => {
        const panel = el.querySelector('.ops-settings__card')!
        const r = panel.getBoundingClientRect()
        const s = getComputedStyle(panel)
        const controls = [...panel.querySelectorAll('button')].map(b => b.getBoundingClientRect())
        const small = [...panel.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14)
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, background: getComputedStyle(el).backgroundColor, border: s.borderTopWidth, scroll: panel.scrollWidth > panel.clientWidth + 1, small: small.length, targets: controls.filter(r => r.width < 44 || r.height < 44).length }
      })
      expect(geometry.top).toBe(0)
      expect(geometry.bottom).toBe(viewport.height)
      expect(geometry.left).toBe(0)
      expect(geometry.right).toBe(viewport.width)
      expect(geometry.background).not.toBe('rgba(0, 0, 0, 0)')
      expect(geometry.border).toBe('0px')
      expect(geometry.scroll).toBe(false)
      expect(geometry.small).toBe(0)
      expect(geometry.targets).toBe(0)
      await expect(sheet.getByText('Lock to portrait or landscape')).toBeVisible()
      await expect(page.getByTestId('settings-close')).toBeVisible()
      await expect(page.getByTestId('hub-btn')).toBeVisible()
      await page.screenshot({ path: info.outputPath(`settings-${name}.png`) })
      await sheet.getByRole('button', { name: 'Portrait', exact: true }).click()
      await expect(sheet.getByRole('button', { name: 'Portrait', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await sheet.getByRole('button', { name: 'Auto', exact: true }).click()
      await page.getByTestId('patch-notes-button').click()
      await expect(page.getByTestId('patch-notes')).toBeVisible()
      await sheet.getByRole('button', { name: 'Back', exact: true }).click()
      await page.getByTestId('reset-progress').scrollIntoViewIfNeeded()
      await expect(page.getByTestId('reset-progress')).toBeInViewport()
      await page.screenshot({ path: info.outputPath(`settings-bottom-${name}.png`) })
      await page.getByTestId('settings-close').click()
      await expect(sheet).toHaveCount(0)
      await page.getByTestId('hub-btn').click()
      await page.getByTestId('base-menu-settings').click()
      await expect(sheet).toBeVisible()
    })
  })
}
