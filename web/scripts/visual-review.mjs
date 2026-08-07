#!/usr/bin/env node
// KES-114: automated design-compliance review of Visual QA screenshots.
//
// Reads every PNG under the given screenshots directory, sends them to a
// vision-capable Claude model in batches, and asks it to flag violations of
// Landnam's standing design rules (CLAUDE.md). Writes a Markdown report to
// stdout (redirect to a file) so visual-qa.yml can splice it into the same
// PR comment it already posts.
//
// Degrades gracefully with no ANTHROPIC_API_KEY: writes a short "skipped"
// note instead of failing the workflow — this step must never be why Visual
// QA goes red for a repo that hasn't configured the secret yet.

import { readdir } from 'node:fs/promises'
import path from 'node:path'

const SCREENSHOTS_DIR = process.argv[2] || 'cypress/screenshots'
const MODEL = process.env.VISUAL_REVIEW_MODEL || 'claude-sonnet-4-5-20250929'
const BATCH_SIZE = 6
// Hard cap so a huge screenshot run (e.g. a full playthrough) can't run away
// on API cost — sampling the run is enough to catch systemic violations.
const MAX_SCREENSHOTS = 24

const DESIGN_RULES = `Landnam UI design rules — flag any screenshot that violates one of these:
1. Amber (--ln-amber) is restricted to genuine payout/reward emphasis in small elements only — never a panel accent, headline, primary button, or generic UI chrome (sort controls, info panels, dismiss buttons).
2. 8pt spacing rhythm: visible gaps/padding should look like multiples of 4/8/12/16/24/32/48/64px, not arbitrary values.
3. No emoji anywhere in the UI. Status must be communicated via shape + color + label.
4. Instrument labels and CTAs should be UPPERCASE with visible letter-spacing.
5. Operations screens (Mining HUD, Transit, Debrief, Mission Board contract list) use a dark command-deck theme. Reference/guide/market/menu-style surfaces use a light editorial theme. A screen mixing both, or an operations screen gone light-editorial (or vice versa) unless it's the Launchpad scene-panel exception, is a violation.
6. No hardcoded-looking hex colors that clash with the rest of the dark-charcoal/cyan-amber palette.`

async function findScreenshots(dir) {
  const results = []
  async function walk(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name.toLowerCase().endsWith('.png')) results.push(full)
    }
  }
  await walk(dir)
  return results.sort()
}

async function fileToBase64(filePath) {
  const { readFile } = await import('node:fs/promises')
  const buf = await readFile(filePath)
  return buf.toString('base64')
}

async function reviewBatch(apiKey, files) {
  const content = [
    {
      type: 'text',
      text: `${DESIGN_RULES}\n\nReview the ${files.length} screenshots below (filenames given in order). Respond with ONLY a JSON array, one entry per screenshot that has at least one violation: [{"file": "<filename>", "violations": ["<short description>", ...]}]. Screenshots with no violations must be omitted entirely — respond with [] if none of the ${files.length} have issues.`,
    },
  ]
  for (const file of files) {
    content.push({ type: 'text', text: `Filename: ${path.basename(file)}` })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: await fileToBase64(file) },
    })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`)
  }

  const data = await res.json()
  const text = (data.content ?? []).map(block => block.text ?? '').join('')
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.log('## AI Screenshot Review\n\n_Skipped — `ANTHROPIC_API_KEY` is not configured for this repo._\n')
    return
  }

  const allFiles = await findScreenshots(SCREENSHOTS_DIR)
  if (allFiles.length === 0) {
    console.log('## AI Screenshot Review\n\n_No screenshots found to review._\n')
    return
  }

  const files = allFiles.slice(0, MAX_SCREENSHOTS)
  const findings = []
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    try {
      const batchFindings = await reviewBatch(apiKey, batch)
      findings.push(...batchFindings)
    } catch (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message)
    }
  }

  const sampledNote = allFiles.length > MAX_SCREENSHOTS
    ? ` (sampled first ${MAX_SCREENSHOTS} of ${allFiles.length})`
    : ''

  let out = `## AI Screenshot Review\n\nReviewed ${files.length} screenshot(s)${sampledNote} against Landnam's design rules.\n\n`
  if (findings.length === 0) {
    out += '_No design-rule violations flagged._\n'
  } else {
    out += `${findings.length} screenshot(s) flagged:\n\n`
    for (const finding of findings) {
      out += `**\`${finding.file}\`**\n`
      for (const violation of finding.violations ?? []) {
        out += `  - ${violation}\n`
      }
      out += '\n'
    }
  }
  console.log(out)
}

main().catch(error => {
  console.error('visual-review.mjs failed:', error)
  console.log('## AI Screenshot Review\n\n_Review step errored — see workflow logs._\n')
})
