import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

Given('User opens the {string} page', (path: string) => {
  cy.visit(path);
});

Given('User opens the {string} page with {string} viewport', (path: string, viewport: string) => {
  const [width, height] = viewport.split('x').map(Number);
  cy.viewport(width, height).visit(path);
});

When('User clicks on the {string} link', (link: string) => {
  cy.get(`a[href*="${link}"]`).first().click();
});

When('User clicks on the {string} button', (button: string) => {
  cy.contains('button',`${button}`).click();
});

When('User clicks first link on the {string} table', (number: string) => {
  cy.get('table').eq(parseInt(number)).get('tbody tr').find('a').first().click();
});

When('User clicks on the {string} tab', (link: string) => {
  cy.contains('a', `${link}`).click();
});

When('User clicks on the {int}st/nd/rd/th button or link with id {string}', (idx: number, id: string) => {
  cy.get(`[data-testid="${id}"]`).eq(idx - 1).click();
});

When('User clicks on the button with {string} {string}', (property: string, label: string) => {
  cy.get(`button[${property}="${label}"]`).click();
});

When('User types {string} in the {string} input', (text: string, input: string) => {
  cy.get(`input[name="${input}"]`).type(text);
});

When('User types {string} in the input with placeholder {string}', (text: string, placeholder: string) => {
  cy.get(`input[placeholder="${placeholder}"]`).type(text);
});

When('User types {string} for {string}', (text: string, element: string) => {
  cy.contains('span', `${element}`).closest('div').find('input').first().type(`${text}`);
});

When('User types {string} into the {int}st/nd/rd/th input with id {string}', (text: string, idx:number, id: string) =>{
  cy.get(`[data-testid="${id}"]`).eq(idx - 1).clear().type(`${text}`);
});

When('User waits for {string} seconds while loading',(second: string) => {
  cy.wait(parseInt(second) * 1000);
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
  cy.get('[data-testid="type-label"]').invoke('text')
  .then((text) => {
    if (text.trim() === 'tuple') {
      cy.get('[data-testid="code-section"').should('contain', `${input}`);
    } else {
      cy.get('[data-testid="encode-value-input"').should('have.value', `${input}`);
    }
  });
});

Then('Drawer has {int} queued transactions', (idx: number) => {
  cy.get('div[role="alert"]').should('contain',`${String(idx)}`)
});

Then('{string} value on {string} attribute should exists', (value: string, attribute: string) => {
  cy.get(`[${attribute}="${value}"]`).should('exist');
});