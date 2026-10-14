/// <reference types="cypress" />

/**
 * LLM çağrıları varsayılan olarak cypress/fixtures/llm/<sayfa>.json içeriğiyle
 * yanıtlanır (deterministik CI ve video). Canlı modda (CYPRESS_LIVE_LLM=1 ve
 * CYPRESS_LLM_BASE_URL / CYPRESS_LLM_MODEL / CYPRESS_LLM_API_KEY) gerçek sağlayıcı kullanılır.
 * Değerler Cypress 15+ `cy.env()` ile okunur (anahtar spec koduna gömülmez).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      openHarness(page: string): Chainable<void>
      mockLlm(page: string): Chainable<void>
      pause_(ms: number): Chainable<void>
    }
  }
}

interface LiveSettings {
  LIVE_LLM?: string
  LLM_BASE_URL?: string
  LLM_MODEL?: string
  LLM_API_KEY?: string
}
let settings: LiveSettings = {}
let fast = false

export const live = () => Boolean(settings.LIVE_LLM)
/** Hızlı (beklemesiz) çalıştırma — sistem testleri için. */
export const setFast = (v: boolean) => {
  fast = v
}

beforeEach(() => {
  cy.env<LiveSettings>(['LIVE_LLM', 'LLM_BASE_URL', 'LLM_MODEL', 'LLM_API_KEY'], { log: false }).then((e) => {
    settings = e ?? {}
  })
})

/** OpenAI uyumlu bir tool-call yanıtı üretir (page-agent'in LLM istemcisinin beklediği biçim). */
function toolCallResponse(args: unknown) {
  return {
    id: 'chatcmpl-fixture',
    object: 'chat.completion',
    model: 'fixture',
    choices: [
      {
        index: 0,
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'submit_risk_report', arguments: JSON.stringify(args) } }],
        },
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}

Cypress.Commands.add('mockLlm', (page: string) => {
  if (live()) {
    cy.intercept('POST', '**/chat/completions').as('llm')
    return
  }
  cy.fixture(`llm/${page}.json`).then((fx: { parts: unknown[] }) => {
    cy.intercept('POST', '**/chat/completions', (req) => {
      const user: string = req.body.messages?.[1]?.content ?? ''
      const part = Number(/This is part (\d+) of/.exec(user)?.[1] ?? 1)
      req.reply({ statusCode: 200, body: toolCallResponse(fx.parts[part - 1] ?? fx.parts[0]), delay: 600 })
    }).as('llm')
  })
})

Cypress.Commands.add('openHarness', (page: string) => {
  cy.visit(`/index.html?page=fixtures/${page}.html`, {
    onBeforeLoad(win) {
      if (live()) {
        win.localStorage.setItem('sr-harness-llm', JSON.stringify({ baseURL: settings.LLM_BASE_URL, model: settings.LLM_MODEL, apiKey: settings.LLM_API_KEY }))
      } else win.localStorage.removeItem('sr-harness-llm')
    },
  })
  cy.get('#page').its('0.contentDocument.readyState').should('eq', 'complete')
})

/** Videoda izleyicinin okuyabilmesi için bekleme (testin mantığını etkilemez). */
Cypress.Commands.add('pause_', (ms: number) => {
  cy.wait(fast ? 0 : ms, { log: false })
})

export {}
