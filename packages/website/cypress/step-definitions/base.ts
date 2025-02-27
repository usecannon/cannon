import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

Given('User opens the {string} page', (path: string) => {
  cy.visit(path);
});

When('User clicks on the {string} link', (link: string) => {
  cy.get(`a[href*="${link}"]`).first().click();
});

When('User clicks on the {string} button', (button: string) => {
  cy.contains('button', `${button}`).click();
});

When('User clicks on the {string} tab', (link: string) => {
  cy.contains('a', `${link}`).click();
});

When('User clicks on the {int}st/nd/rd/th element with id {string}', (idx: number, id: string) => {
  cy.get(`[data-testid="${id}"]`)
    .eq(idx - 1)
    .click({ force: true });
});

When('User types {string} in the {string} input', (text: string, input: string) => {
  cy.get(`input[name="${input}"]`).type(text);
});

When('User types {string} in the input with placeholder {string}', (text: string, placeholder: string) => {
  cy.get(`input[placeholder="${placeholder}"]`).type(text);
});

When('User types {string} into the {int}st/nd/rd/th input with id {string}', (text: string, idx: number, id: string) => {
  cy.get(`input[data-testid="${id}"]`)
    .eq(idx - 1)
    .clear({ force: true })
    .type(`${text}`);
});

When('User waits for {int} seconds while loading', (seconds: number) => {
  cy.wait(seconds * 1000);
});

Then('URL includes {string}', (path: string) => {
  cy.url().should('include', path);
});

Then('View renders a {string} displaying the text {string}', (element: string, text: string) => {
  cy.get(element).contains(text);
});

Then('View contains the {string} input', (input: string) => {
  cy.get(`input[name="${input}"]`).should('be.visible');
});

Then('The {string} element should be visible', (element: string) => {
  cy.get(`${element}`).should('be.visible');
});

Then('Output contains {string}', (input: string) => {
  cy.get('[data-testid="type-label"]')
    .invoke('text')
    .then((text) => {
      if (text.trim() === 'tuple') {
        cy.get('[data-testid="code-section"').should('contain', `${input}`);
      } else {
        cy.get('[data-testid="encode-value-input"').should('have.value', `${input}`);
      }
    });
});

Then('The element with id {string} has {int} queued transactions', (element: string, idx: number) => {
  cy.get(`[data-testid="${element}"]`)
    .should('exist')
    .scrollIntoView()
    .should('be.visible')
    .should('contain', `${String(idx)}`);
});

Then('{string} value on {string} attribute should exist', (value: string, attribute: string) => {
  cy.get(`[${attribute}="${value}"]`).should('exist');
});

Then('{string} value on {string} attribute should not exist', (value: string, attribute: string) => {
  cy.get(`[${attribute}="${value}"]`).should('not.exist');
});

Then('The value with id {string} should be empty', (id: string) => {
  cy.get(`[data-testid="${id}"]`).should('have.value', '');
});

Then('The {int}st/nd/rd/th element with id {string} should have {string}', (idx: number, id: string, text: string) => {
  cy.get(`[data-testid="${id}"]`)
    .eq(idx - 1)
    .should('contain', text);
});

Then('The {int}st/nd/rd/th input with id {string} should have {string}', (idx: number, id: string, text: string) => {
  cy.get(`input[data-testid="${id}"]`)
    .eq(idx - 1)
    .should('have.value', text);
});

Then('{string} element has {string} value on {string} attribute', (element: string, value: string, attribute: string) => {
  cy.get(`${element}`).should(`have.${attribute}`, `${value}`);
});
