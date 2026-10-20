// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { releaseEditorFollow } from './dev-follow'

describe('releaseEditorFollow', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/game/missions?follow=1')
  })

  it('lets an in-game Back action take control from the editor follower', () => {
    expect(releaseEditorFollow()).toBe(true)
    expect(window.location.pathname).toBe('/game/missions')
    expect(new URLSearchParams(window.location.search).get('follow')).toBe('0')
  })
})
