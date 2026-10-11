import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCENE_NAMES } from './ui-strings'

const forbiddenHomeTitles = ['Earth', 'Base'].join(' ') + '|' + ['Earth', 'HQ'].join(' ')
const homeSceneSources = [
  'lib/scene-scope.ts',
  'lib/data/scenes.ts',
  'lib/help/topics.ts',
  '../native/App/Screens/SignInScreen.swift',
]

describe('scene names', () => {
  it('keeps the Base name canonical', () => {
    expect(SCENE_NAMES.base).toBe('Base')
  })

  it('does not allow retired home scene titles in source', () => {
    const retired = new RegExp(forbiddenHomeTitles)
    for (const source of homeSceneSources) {
      expect(readFileSync(resolve(process.cwd(), source), 'utf8'), source).not.toMatch(retired)
    }
  })
})
