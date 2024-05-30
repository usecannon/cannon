import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

Given('User opens the {string} page', (path: string) => {
  cy.visit(path);
});

When('User clicks on the {string} link', (link: string) => {
  cy.get(`a[href*="${link}"]`).click();
});

When('User clicks on the {string} button', (button: string) => {
  cy.get(`button:contains("${button}")`).click();
});

When('User clicks on the button with id {string}', (id: string) => {
  cy.get(`#${id}`).click();
});

When('User clicks on the {string} element with text {string}', (element: string, text: string) => {
  cy.get(element).contains(text).click();
});

When('User types {string} in the {string} input', (text: string, input: string) => {
  cy.get(`input[name="${input}"]`).type(text);
});

Then('URL includes {string}', (path: string) => {
  cy.url().should('include', path);
});

Then('View renders a {string} displaying the text {string}', (element: string, text: string) => {
  cy.get(element).contains(text);
});
