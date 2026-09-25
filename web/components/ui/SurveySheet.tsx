'use client'

import React, { useEffect, useState } from 'react'
import { SURVEY_DEFS, isSurveyRuntimeEnabled, submitSurveyResponse, trackSurveyShown, onSurveyDismissed, type Survey, type SurveyQuestion } from '@/lib/surveys'

type Responses = Record<string, string | number>
type SurveyTestWindow = Window & { __landnamTriggerSurvey?: (surveyKey: string) => void }

function RatingQuestion({ question, value, onChange }: { question: SurveyQuestion; value: number | undefined; onChange: (v: number) => void }) {
  const scale = question.scale ?? 5
  const labels: Record<number, string> = scale === 5
    ? { 1: 'Terrible', 2: 'Poor', 3: 'OK', 4: 'Good', 5: 'Great' }
    : {}
  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: 'var(--ln-text)', marginBottom: 14, lineHeight: 1.4 }}>
        {question.question}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {Array.from({ length: scale }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            data-testid={`survey-rating-${n}`}
            onClick={() => onChange(n)}
            style={{
              width: 48, height: 48, borderRadius: 12, border: 'none',
              background: value === n ? 'var(--ln-cyan)' : 'var(--ln-surface-2)',
              color: value === n ? 'var(--ln-text-on-cyan)' : 'var(--ln-text-dim)',
              fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', transition: 'background 120ms, color 120ms',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {value != null && labels[value] && (
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
          {labels[value]}
        </div>
      )}
    </div>
  )
}

function MultipleChoiceQuestion({ question, value, onChange }: { question: SurveyQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: 'var(--ln-text)', marginBottom: 12, lineHeight: 1.4 }}>
        {question.question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(question.choices ?? []).map(choice => (
          <button
            key={choice}
            type="button"
            data-testid="survey-choice"
            onClick={() => onChange(choice)}
            style={{
              padding: '10px 14px', borderRadius: 10, border: 'none', textAlign: 'left',
              background: value === choice ? 'var(--ln-cyan-soft)' : 'var(--ln-surface)',
              color: value === choice ? 'var(--ln-cyan-bright)' : 'var(--ln-text-dim)',
              fontFamily: 'var(--ln-font-body)', fontSize: 13, cursor: 'pointer',
              outline: value === choice ? '1px solid var(--ln-cyan-border)' : '1px solid var(--ln-hairline)',
              transition: 'background 100ms, color 100ms',
            }}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  )
}

function OpenQuestion({ question, value, onChange }: { question: SurveyQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: 'var(--ln-text)', marginBottom: 12, lineHeight: 1.4 }}>
        {question.question}
      </div>
      <textarea
        data-testid="survey-open-response"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="Optional — type here..."
        style={{
          width: '100%', padding: '10px 12px', boxSizing: 'border-box',
          background: 'var(--ln-void)', border: '1px solid var(--ln-hairline)',
          borderRadius: 10, resize: 'none', outline: 'none',
          fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)', lineHeight: 1.5,
        }}
      />
    </div>
  )
}

export default function SurveySheet({ blockWhile }: { blockWhile?: boolean }) {
  const [surveyKey, setSurveyKey] = useState<string | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [responses, setResponses] = useState<Responses>({})
  const [done, setDone] = useState(false)
  const pendingKeyRef = React.useRef<string | null>(null)
  const blockWhileRef = React.useRef(blockWhile)
  blockWhileRef.current = blockWhile

  const showSurvey = React.useCallback((key: string) => {
    if (!isSurveyRuntimeEnabled()) return
    const def = SURVEY_DEFS[key]
    if (!def) return
    setSurveyKey(key)
    setSurvey(def)
    setQIndex(0)
    setResponses({})
    setDone(false)
    trackSurveyShown(key)
  }, [])

  // Receive survey events; defer if a popup/coach/territory overlay is blocking
  useEffect(() => {
    const handler = (e: Event) => {
      const { surveyKey: key } = (e as CustomEvent<{ surveyKey: string }>).detail
      const def = SURVEY_DEFS[key]
      if (!def) return
      if (blockWhileRef.current) {
        pendingKeyRef.current = key
        return
      }
      showSurvey(key)
    }
    window.addEventListener('landnam:survey', handler)
    return () => window.removeEventListener('landnam:survey', handler)
  }, [showSurvey])

  useEffect(() => {
    if (!isSurveyRuntimeEnabled()) return
    const testWindow = window as SurveyTestWindow
    testWindow.__landnamTriggerSurvey = showSurvey
    return () => {
      delete testWindow.__landnamTriggerSurvey
    }
  }, [showSurvey])

  // When all overlays clear, show any deferred survey
  useEffect(() => {
    if (blockWhile || !pendingKeyRef.current || surveyKey) return
    const key = pendingKeyRef.current
    pendingKeyRef.current = null
    const def = SURVEY_DEFS[key]
    if (!def) return
    setTimeout(() => {
      showSurvey(key)
    }, 800)
  }, [blockWhile, surveyKey, showSurvey])

  if (!survey || !surveyKey) return null

  const question = survey.questions[qIndex]
  const currentValue = question ? responses[question.id] : undefined
  const isLast = qIndex >= survey.questions.length - 1
  const canAdvance = question?.type === 'open' || currentValue != null

  function handleSetResponse(value: string | number) {
    if (!question) return
    setResponses(r => ({ ...r, [question.id]: value }))
  }

  function handleNext() {
    if (!isLast) {
      setQIndex(i => i + 1)
    } else {
      submitSurveyResponse(surveyKey!, responses)
      setDone(true)
      setTimeout(() => {
        setSurveyKey(null)
        setSurvey(null)
        onSurveyDismissed()
      }, 1600)
    }
  }

  function handleSkip() {
    setSurveyKey(null)
    setSurvey(null)
    onSurveyDismissed()
  }

  return (
    <aside data-testid="survey-sheet" aria-label="Quick question" style={{
      position: 'absolute', zIndex: 94, right: 16, bottom: 'calc(var(--ln-nav-h, 64px) + 16px)',
      width: 'min(420px, calc(100% - 32px))', pointerEvents: 'auto',
      background: 'var(--ln-panel)', border: '2px solid var(--ln-cyan-border)',
      padding: '16px 16px 24px', boxShadow: 'var(--ln-shadow-panel)',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
            Quick question {survey.questions.length > 1 ? `${qIndex + 1} / ${survey.questions.length}` : ''}
          </div>
          <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', padding: 4 }}>
            SKIP
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--ln-font-display)', fontSize: 13, color: 'var(--ln-cyan-bright)', letterSpacing: '0.08em' }}>
            Thanks — that helps a lot.
          </div>
        ) : question ? (
          <>
            {question.type === 'rating' && (
              <div data-testid="survey-question" data-question-id={question.id} data-question-type={question.type}>
                <RatingQuestion question={question} value={currentValue as number | undefined} onChange={handleSetResponse} />
              </div>
            )}
            {question.type === 'multiple_choice' && (
              <div data-testid="survey-question" data-question-id={question.id} data-question-type={question.type}>
                <MultipleChoiceQuestion question={question} value={currentValue as string | undefined} onChange={handleSetResponse} />
              </div>
            )}
            {question.type === 'open' && (
              <div data-testid="survey-question" data-question-id={question.id} data-question-type={question.type}>
                <OpenQuestion question={question} value={currentValue as string | undefined} onChange={handleSetResponse} />
              </div>
            )}

            <button
              type="button"
              data-testid="survey-next"
              onClick={handleNext}
              disabled={!canAdvance}
              style={{
                marginTop: 16, width: '100%', padding: 13, borderRadius: 10, border: 'none',
                background: canAdvance ? 'var(--ln-cyan)' : 'var(--ln-surface-2)',
                color: canAdvance ? 'var(--ln-text-on-cyan)' : 'var(--ln-text-muted)',
                fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {isLast ? 'Send' : 'Next'}
            </button>
          </>
        ) : null}
    </aside>
  )
}
