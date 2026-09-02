import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MissionHistoryScreen from './MissionHistoryScreen'

describe('MissionHistoryScreen', () => {
  it('shows completed operations in reverse completion order', () => {
    const markup = renderToStaticMarkup(
      <MissionHistoryScreen
        onBack={() => {}}
        records={[
          { id: 'old', title: 'Old Survey', targetName: 'Mars', completedAt: 100, runId: 'run-old' },
          { id: 'new', title: 'New Survey', clientName: 'Meridian', targetName: 'Luna', completedAt: 200, runId: 'run-new' },
        ]}
      />,
    )

    expect(markup.indexOf('New Survey')).toBeLessThan(markup.indexOf('Old Survey'))
    expect(markup).toContain('MISSIONS COMPLETED')
    expect(markup).toContain('Meridian')
    expect(markup).not.toContain('AFFINITY')
    expect(markup).not.toContain('PROGRAM RIGHTS')
  })

  it('explains how to start when the log is empty', () => {
    const markup = renderToStaticMarkup(<MissionHistoryScreen onBack={() => {}} records={[]} />)
    expect(markup).toContain('No completed missions yet')
  })
})
