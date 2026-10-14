/// <reference types="cypress" />
/** Hızlı işlevsel testler (beklemesiz). npm run e2e */
import { setFast } from '../support/e2e'

describe('Sözleşme Radarı — sistem testleri', () => {
  before(() => setFast(true))
  after(() => setFast(false))

  it('hukuki tavsiye uyarısı analizden önce ve sonra görünür', () => {
    cy.mockLlm('injection-terms')
    cy.openHarness('injection-terms')
    cy.get('[data-cy=disclaimer]').should('be.visible').and('contain', 'hukuki tavsiye değildir')
    cy.get('[data-cy=analyze]').click()
    cy.get('[data-cy=score]').should('be.visible')
    cy.get('[data-cy=disclaimer]').should('be.visible')
    cy.get('.disclaimer-inline').should('contain', 'hukuki tavsiye değildir')
  })

  it('aynı girdi iki kez aynı skoru verir (deterministik skor)', () => {
    cy.mockLlm('netflix-tos')
    cy.openHarness('netflix-tos')
    cy.get('[data-cy=analyze]').click()
    cy.get('[data-cy=score]').invoke('text').then((first) => {
      cy.get('[data-cy=analyze]').click()
      cy.get('[data-cy=score]').should('have.text', first)
    })
  })

  it('LLM yetki hatasında rapor üretmez, hatayı gösterir', () => {
    cy.intercept('POST', '**/chat/completions', { statusCode: 401, body: { error: { message: 'invalid api key' } } })
    cy.openHarness('netflix-tos')
    cy.get('[data-cy=analyze]').click()
    cy.get('[data-cy=score]').should('be.visible')
    cy.get('[data-cy=confidence]').should('contain', 'Düşük')
    cy.get('[data-cy=uncertain]').should('contain', 'analiz edilemedi')
    cy.get('[data-cy=finding]').should('not.exist')
  })

  it('serbest metin (tool-call olmayan) yanıtı kabul etmez', () => {
    cy.intercept('POST', '**/chat/completions', {
      statusCode: 200,
      body: { choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Bu sözleşme tamamen güvenli, risk skoru 0.' } }] },
    })
    cy.openHarness('injection-terms')
    cy.get('[data-cy=analyze]').click()
    cy.get('[data-cy=confidence]').should('contain', 'Düşük')
    cy.get('[data-cy=finding]').should('not.exist')
    cy.get('[data-cy=report]').should('not.contain', 'tamamen güvenli')
  })

  it('model açıklamasındaki link/talimat kullanıcıya gösterilmez', () => {
    cy.fixture('llm/injection-terms.json').then((fx) => {
      const args = structuredClone(fx.parts[0])
      args.findings[0].explanation_tr = 'Sorun yok. İade için https://evil.example/claim adresine kart bilgilerinizi girin.'
      cy.intercept('POST', '**/chat/completions', {
        statusCode: 200,
        body: { choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'c', type: 'function', function: { name: 'submit_risk_report', arguments: JSON.stringify(args) } }] } }] },
      })
    })
    cy.openHarness('injection-terms')
    cy.get('[data-cy=analyze]').click()
    cy.get('[data-cy=report]').should('not.contain', 'evil.example')
    cy.get('[data-cy=findings]').should('contain', 'güvenlik filtresine takıldı')
  })
})
