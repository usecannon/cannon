import { Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';

Given('User opens the {string} page', (path: string) => {
  cy.visit(path);
});

When('User clicks on the {string} link', (link: string) => {
  cy.get(`a[href*="${link}"]`).click();
});

Then('URL includes {string} string', (path: string) => {
  cy.url().should('include', path);
});

Then('View renders a {string} displaying the text {string}', (element: string, text: string) => {
  cy.get(element).contains(text);
});
