'use client'

import { useEffect, useRef, useState } from 'react'
import type { Survey, SurveyResponseValue } from 'posthog-js'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import { surveyResponseKey, trackSurveyDismissed, trackSurveySent, trackSurveyShown } from '@/lib/analytics'

export default function SurveyPrompt({ survey, onClose }: {
  survey: Survey
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [responses, setResponses] = useState<Record<number, SurveyResponseValue>>({})
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    trackSurveyShown(survey)
  }, [survey])

  const question = survey.questions[step]
  const isLast = step === survey.questions.length - 1
  const value = responses[step]

  function setValue(v: SurveyResponseValue) {
    setResponses(current => ({ ...current, [step]: v }))
  }

  function toggleChoice(choice: string) {
    const current = Array.isArray(value) ? value : []
    setValue(current.includes(choice) ? current.filter(c => c !== choice) : [...current, choice])
  }

  function buildPayload() {
    const payload: Record<string, SurveyResponseValue> = {}
    survey.questions.forEach((_, index) => {
      const answer = responses[index]
      if (answer != null && answer !== '' && !(Array.isArray(answer) && answer.length === 0)) {
        payload[surveyResponseKey(index)] = answer
      }
    })
    return payload
  }

  function next() {
    if (isLast) {
      trackSurveySent(survey, buildPayload(), true)
      onClose()
      return
    }
    setStep(s => s + 1)
  }

  function skip() {
    const payload = buildPayload()
    if (Object.keys(payload).length > 0) {
      trackSurveySent(survey, payload, false)
    } else {
      trackSurveyDismissed(survey)
    }
    onClose()
  }

  return (
    <div>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#87CFFA', textTransform: 'uppercase' }}>
        {survey.name}
      </div>
      {survey.questions.length > 1 && (
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#6f8299', marginTop: 4 }}>
          Question {step + 1} of {survey.questions.length}
        </div>
      )}
      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff', marginTop: 10, lineHeight: 1.4 }}>
        {question.question}
      </div>

      {question.type === 'rating' && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: question.scale }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setValue(n)}
                style={{
                  flex: '1 0 32px', minWidth: 32, height: 36, borderRadius: 8,
                  border: value === n ? '1px solid #87CFFA' : '1px solid rgba(135,207,250,0.3)',
                  background: value === n ? 'rgba(135,207,250,0.25)' : 'rgba(8,16,28,0.7)',
                  color: '#e6efff', fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                }}
              >{n}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--ln-font-body)', fontSize: 10, color: '#6f8299' }}>
            <span>{question.lowerBoundLabel}</span>
            <span>{question.upperBoundLabel}</span>
          </div>
        </div>
      )}

      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.choices.map(choice => {
            const selected = question.type === 'single_choice' ? value === choice : Array.isArray(value) && value.includes(choice)
            return (
              <button
                key={choice}
                onClick={() => question.type === 'single_choice' ? setValue(choice) : toggleChoice(choice)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                  border: selected ? '1px solid #87CFFA' : '1px solid rgba(135,207,250,0.3)',
                  background: selected ? 'rgba(135,207,250,0.25)' : 'rgba(8,16,28,0.7)',
                  color: '#e6efff', fontFamily: 'var(--ln-font-body)', fontSize: 13,
                  cursor: 'pointer',
                }}
              >{choice}</button>
            )
          })}
        </div>
      )}

      {question.type === 'open' && (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={e => setValue(e.target.value)}
          placeholder="Type your answer..."
          rows={3}
          style={{
            width: '100%', marginTop: 12, padding: 10, borderRadius: 10, resize: 'vertical',
            background: 'rgba(8,16,28,0.7)', border: '1px solid rgba(135,207,250,0.3)',
            color: '#e6efff', fontFamily: 'var(--ln-font-body)', fontSize: 13,
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <div style={{ flex: 1 }}><GhostBtn onClick={skip}>Skip</GhostBtn></div>
        <div style={{ flex: 1 }}><PrimaryBtn kind="cyan" onClick={next}>{isLast ? 'Submit' : 'Next'}</PrimaryBtn></div>
      </div>
    </div>
  )
}
