// Relative, not the `@/` alias. Cypress's bundler does not read tsconfig
// `paths`, and every other spec gets away with `@/` only because they import
// *types* — which TypeScript erases before webpack ever tries to resolve them.
// This is the one spec importing a runtime value, so it is the one that broke.
import { SURVEY_DEFS } from '../../../lib/survey-defs'

const STORAGE_KEY = 'landnam-game-state-v1'
const SURVEY_STORAGE_KEY = 'landnam-surveys-shown'

type SurveyPayload = {
  $survey_id: string
  $survey_name: string
  $survey_completed: boolean
  $survey_submission_id: string
  $survey_questions: Array<{ id: string; question: string; response?: string | number }>
  [key: string]: unknown
}

type SurveyTestWindow = Window & { __landnamTriggerSurvey?: (surveyKey: string) => void }

const SURVEY_KEYS = Object.keys(SURVEY_DEFS)
const SURVEY_KEY_BY_ID = Object.fromEntries(
  Object.entries(SURVEY_DEFS).map(([key, survey]) => [survey.id, key]),
)

const baseState = {
  screen: 'hub',
  player: {
    francs: 9_500_000_000,
    activeMission: null,
    missionCount: 1,
    pendingLaunch: false,
    placed: ['launchpad'],
    placementPlots: { launchpad: 1 },
    controlBuilt: false,
    missionsDone: 1,
    skillPoints: 0,
    unlockedSkillNodes: [],
    freeOperations: false,
    clientMissions: {},
    clientStreaks: {},
    clientCooldowns: {},
    researchAnnotations: 0,
    refineryBuilt: false,
    refineryUnlocked: false,
    refineryUnlockNotified: false,
    refineryQueue: [],
    refinedGoods: {},
    launchpadUpgraded: false,
    loanDebt: 0,
    loanOffered: false,
    seen_planets: [],
    roverDeployments: [],
    clientTerritories: {},
  },
  missionId: null,
  targetId: null,
  rocket: { chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' },
  lastCargo: null,
  tutorial: false,
  doneSteps: { 1: true, 2: true, 3: true, 4: true, 5: true },
  popup: null,
  menuOpen: false,
}

function visitGame() {
  cy.visit('/game', {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState))
      win.localStorage.removeItem(SURVEY_STORAGE_KEY)
      win.localStorage.setItem('landnam-guest-credentials', JSON.stringify({ email: 'e2e@landnam.guest', password: 'e2e-guest-test' }))
      win.localStorage.setItem('landnam-upgrade-prompt-snooze-until', String(Date.now() + 365 * 24 * 60 * 60 * 1000))
    },
  })
}

function answerCurrentQuestion(surveyKey: string) {
  cy.get('[data-testid="survey-question"]').then($question => {
    const questionId = String($question.attr('data-question-id'))
    const questionType = String($question.attr('data-question-type'))
    if (questionType === 'rating') {
      cy.get('[data-testid="survey-rating-5"]').click()
    } else if (questionType === 'multiple_choice') {
      cy.get('[data-testid="survey-choice"]').first().click()
    } else if (questionType === 'open') {
      cy.get('[data-testid="survey-open-response"]').clear().type(`Automated survey QA response for ${surveyKey} / ${questionId}`)
    } else {
      throw new Error(`Unhandled survey question type: ${questionType}`)
    }
  })
}

function answerSurvey(surveyKey: string) {
  const def = SURVEY_DEFS[surveyKey]
  function dispatchSurvey(attemptsLeft = 5) {
    cy.window().then(win => {
      const testWindow = win as SurveyTestWindow
      if (testWindow.__landnamTriggerSurvey) {
        testWindow.__landnamTriggerSurvey(surveyKey)
      } else {
        win.dispatchEvent(new CustomEvent('landnam:survey', { detail: { surveyKey } }))
      }
    })
    cy.wait(250)
    cy.get('body').then($body => {
      if ($body.find('[data-testid="survey-sheet"]').length > 0) return
      if (attemptsLeft <= 0) return
      dispatchSurvey(attemptsLeft - 1)
    })
  }

  dispatchSurvey()
  cy.get('[data-testid="survey-sheet"]').should('be.visible')

  def.questions.forEach((question, index) => {
    cy.get('[data-testid="survey-question"]')
      .should('have.attr', 'data-question-id', question.id)
      .and('have.attr', 'data-question-type', question.type)
    answerCurrentQuestion(surveyKey)
    cy.get('[data-testid="survey-next"]').should('not.be.disabled').click()
    if (index < def.questions.length - 1) {
      cy.get('[data-testid="survey-question"]').should('have.attr', 'data-question-id', def.questions[index + 1].id)
    }
  })

  cy.wait(`@submit-${surveyKey}`).then(interception => {
    const body = interception.request.body as { payload: SurveyPayload; distinctId?: string }
    expect(body.payload.$survey_id).to.eq(def.id)
    expect(body.payload.$survey_name).to.eq(def.name)
    expect(body.payload.$survey_completed).to.eq(true)
    expect(body.payload.$survey_submission_id).to.be.a('string').and.not.be.empty
    expect(body.payload.$survey_questions).to.have.length(def.questions.length)

    def.questions.forEach((question, index) => {
      const submittedQuestion = body.payload.$survey_questions[index]
      expect(submittedQuestion.id).to.eq(question.id)
      expect(submittedQuestion.question).to.eq(question.question)
      expect(submittedQuestion.response).to.not.eq(undefined)
      expect(body.payload[`$survey_response_${question.id}`]).to.eq(submittedQuestion.response)
      const legacyKey = index === 0 ? '$survey_response' : `$survey_response_${index}`
      expect(body.payload[legacyKey]).to.eq(submittedQuestion.response)
    })
  })

  cy.contains('Thanks').should('be.visible')
  cy.get('[data-testid="survey-sheet"]', { timeout: 3000 }).should('not.exist')
}

describe('Survey QA flow', () => {
  it('triggers and answers every registered Landnam survey with PostHog-compatible payloads', () => {
    cy.intercept('POST', '/api/surveys', req => {
      const surveyId = req.body?.payload?.$survey_id
      const surveyKey = SURVEY_KEY_BY_ID[surveyId]
      if (surveyKey) req.alias = `submit-${surveyKey}`
      req.reply({ statusCode: 200, body: { ok: true } })
    })
    cy.intercept('POST', '/api/milestone-feedback', { statusCode: 200, body: { ok: true } }).as('milestoneFeedback')

    visitGame()
    cy.contains('Earth Base', { timeout: 10000 }).should('be.visible')
    cy.window({ timeout: 10000 })
      .its('__landnamTriggerSurvey')
      .should('be.a', 'function')

    SURVEY_KEYS.forEach(answerSurvey)
  })
})
