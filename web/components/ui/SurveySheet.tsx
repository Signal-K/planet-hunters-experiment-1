'use client'

import React, { useEffect, useState } from 'react'
import { SURVEY_DEFS, submitSurveyResponse, trackSurveyShown, onSurveyDismissed, type Survey, type SurveyQuestion } from '@/lib/surveys'

type Responses = Record<string, string | number>
type SurveyTestWindow = Window & { __landnamTriggerSurvey?: (surveyKey: string) => void }

function RatingQuestion({ question, value, onChange }: { question: SurveyQuestion; value: number | undefined; onChange: (v: number) => void }) {
  const scale = question.scale ?? 5
  const labels: Record<number, string> = scale === 5
    ? { 1: 'Terrible', 2: 'Poor', 3: 'OK', 4: 'Good', 5: 'Great' }
    : {}
  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: '#c8d8f0', marginBottom: 14, lineHeight: 1.4 }}>
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
              background: value === n ? 'linear-gradient(180deg,#6cc2ff,#2d8de0)' : 'rgba(30,55,85,0.6)',
              color: value === n ? '#06121f' : 'rgba(169,184,206,0.9)',
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
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.14em', color: '#6cc2ff', textTransform: 'uppercase' }}>
          {labels[value]}
        </div>
      )}
    </div>
  )
}

function MultipleChoiceQuestion({ question, value, onChange }: { question: SurveyQuestion; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: '#c8d8f0', marginBottom: 12, lineHeight: 1.4 }}>
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
              background: value === choice ? 'rgba(63,169,255,0.18)' : 'rgba(20,40,65,0.5)',
              color: value === choice ? '#87cffa' : 'rgba(169,184,206,0.8)',
              fontFamily: 'var(--ln-font-body)', fontSize: 13, cursor: 'pointer',
              outline: value === choice ? '1px solid rgba(63,169,255,0.4)' : '1px solid rgba(63,169,255,0.1)',
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
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, color: '#c8d8f0', marginBottom: 12, lineHeight: 1.4 }}>
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
          background: 'rgba(8,16,28,0.8)', border: '1px solid rgba(63,169,255,0.2)',
          borderRadius: 10, resize: 'none', outline: 'none',
          fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#e6efff', lineHeight: 1.5,
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
    if (process.env.NODE_ENV === 'production') return
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
    <div data-testid="survey-sheet" style={{ position: 'absolute', inset: 0, zIndex: 94, display: 'flex', alignItems: 'flex-end', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.55)', pointerEvents: 'auto' }} onClick={handleSkip} />
      <div style={{
        position: 'relative', width: '100%', pointerEvents: 'auto',
        background: 'linear-gradient(180deg,#0d1c30,#060d18)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: '1px solid rgba(63,169,255,0.2)',
        padding: '16px 16px 32px',
        boxShadow: '0 -12px 48px rgba(0,0,0,0.65)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#6cc2ff', textTransform: 'uppercase' }}>
            Quick question {survey.questions.length > 1 ? `${qIndex + 1} / ${survey.questions.length}` : ''}
          </div>
          <button type="button" onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'rgba(169,184,206,0.4)', fontFamily: 'var(--ln-font-display)', fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer', padding: 4 }}>
            SKIP
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--ln-font-display)', fontSize: 13, color: '#87cffa', letterSpacing: '0.08em' }}>
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
                background: canAdvance ? 'linear-gradient(180deg,#6cc2ff,#2d8de0)' : 'rgba(44,96,140,0.3)',
                color: canAdvance ? '#06121f' : '#3d5670',
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
      </div>
    </div>
  )
}
