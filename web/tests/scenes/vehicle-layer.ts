import type { Page } from '@playwright/test'

/**
 * Vehicles must never draw over buildings or HUD buttons. A vehicle only has to be *painted below* whatever it
 * can reach, so this resolves real paint order (CSS stacking contexts, z-index, then DOM order) in the page
 * instead of sampling pixels at lucky rover positions.
 *
 * Returns the structures and controls that sit in the rover's lane (their vertical extent meets the rover's
 * band) but are painted *below* it. Empty means the rover can pass any of them without covering it.
 */
export async function vehiclesCoveringScene(page: Page): Promise<{ rover: string; covering: string[]; checked: number }> {
  return page.evaluate(() => {
    const rover = document.querySelector<HTMLElement>('[data-testid="road-rover"]')
    if (!rover) return { rover: 'missing', covering: ['no road-rover mounted'], checked: 0 }

    const css = (el: Element) => getComputedStyle(el)
    const createsContext = (el: Element): boolean => {
      if (el === document.documentElement) return true
      const s = css(el)
      const parent = el.parentElement ? css(el.parentElement) : null
      if ((s.position === 'absolute' || s.position === 'relative') && s.zIndex !== 'auto') return true
      if (s.position === 'fixed' || s.position === 'sticky') return true
      if (s.zIndex !== 'auto' && parent && /flex|grid/.test(parent.display)) return true
      if (parseFloat(s.opacity) < 1) return true
      if (s.transform !== 'none' || s.filter !== 'none' || s.perspective !== 'none' || s.clipPath !== 'none') return true
      if (s.isolation === 'isolate' || s.mixBlendMode !== 'normal') return true
      if (/transform|opacity|filter/.test(s.willChange)) return true
      if (/paint|layout|strict|content/.test(s.contain)) return true
      return false
    }
    // Stacking contexts from the root down to (and including) the element when it makes one.
    const contexts = (el: Element): Element[] => {
      const chain: Element[] = []
      for (let n: Element | null = el; n; n = n.parentElement) if (createsContext(n)) chain.unshift(n)
      return chain
    }
    // Where an element paints inside the stacking context `ctx`: [layer, node used for DOM order].
    const place = (el: Element, chain: Element[], ctx: number): [number, Element] => {
      const next = chain[ctx + 1]
      if (next) {
        const z = css(next).zIndex
        return [z === 'auto' ? 0 : parseInt(z, 10), next]
      }
      // Paints directly in the context: positioned (z-index auto) ancestors-or-self paint in layer 0, static content below.
      let positioned = false
      for (let n: Element | null = el; n && n !== chain[ctx]; n = n.parentElement) if (css(n).position !== 'static') positioned = true
      return [positioned ? 0 : -1, el]
    }
    const paintsAbove = (a: Element, b: Element): boolean => {
      const ca = contexts(a), cb = contexts(b)
      let i = 0
      while (i + 1 < ca.length && i + 1 < cb.length && ca[i + 1] === cb[i + 1]) i += 1
      const [la, na] = place(a, ca, i)
      const [lb, nb] = place(b, cb, i)
      if (la !== lb) return la > lb
      if (na === nb) return false
      return !!(nb.compareDocumentPosition(na) & Node.DOCUMENT_POSITION_FOLLOWING)
    }

    const band = rover.getBoundingClientRect()
    const name = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''}${typeof (el as HTMLElement).className === 'string' && (el as HTMLElement).className ? `.${(el as HTMLElement).className.split(/\s+/)[0]}` : ''}`
    const solid = [...document.querySelectorAll(
      '.earth-base-structure, [data-testid^="building-"], .launchpad-scene-object, button, [role="button"], a[href]',
    )].filter(el => {
      if (rover.contains(el)) return false
      const r = el.getBoundingClientRect(), s = css(el)
      const shown = r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.05
      return shown && r.bottom > band.top && r.top < band.bottom && r.right > 0 && r.left < innerWidth
    })
    const covering = solid.filter(el => paintsAbove(rover, el)).map(name)
    return { rover: name(rover), covering: [...new Set(covering)], checked: solid.length }
  })
}
