import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('User types and select the safe {string}', (text: string) => {
  cy.get('input[role="combobox"]').type(text);
  cy.get('input[role="combobox"]').type('{enter}');
});

When('User closes the queue txns drawer', () => {
  cy.xpath('//div[@role="dialog"]//button[@aria-label="Close"]').click();
});

Then('Drawer has exactly {int} queued transactions', (txs: number) => {
  // Check for Contract labels
  cy.xpath('//label[contains(text(), "Contract")]').should('have.length', txs);

  // Check for Function labels
  cy.xpath('//label[contains(text(), "Function")]').should('have.length', txs);
});
