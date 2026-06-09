import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('User types and select the safe {string}', (text: string) => {
  const [chainId, address] = text.split(':');

  // Click the Select Safe button to open the dialog
  cy.contains('button', 'Select Safe').click();

  // Type chain ID in the first input
  cy.get('[data-testid="safe-chain-input"]').type(chainId);

  // Type address in the second input
  cy.get('[data-testid="safe-address-input"]').type(address);
  cy.get('[data-testid="safe-address-input"]').type('{enter}');

  // Verify the selected safe is displayed correctly with the right content
  cy.get('[data-testid="selected-safe"]')
    .should('exist')
    .and('be.visible')
    .within(() => {
      // Check for the first 6 and last 4 characters of the address
      cy.contains(address.slice(0, 6)).should('exist');
      cy.contains(address.slice(-4)).should('exist');
    });
});

When('User closes the queue txns drawer', () => {
  cy.contains('button', 'Close').should('be.visible').click();
});

When(
  'User selects and clicks on the contract with name {string} of the element # {int}',
  (contractName: string, element: number) => {
    cy.contains('div[role="group"] label', 'Contract')
      .eq(element)
      .siblings('div') // This is the container holding both the input and the dropdown menu
      .within(() => {
        // Cypress is now scoped strictly inside this sibling div
        cy.get('input[role="combobox"]').click();
        cy.contains('div', contractName).click();
      });
  },
);

When(
  'User selects and clicks on the function with name {string} of the element # {int}',
  (functionName: string, element: number) => {
    cy.contains('div[role="group"] label', 'Function')
      .eq(element)
      .siblings('div') // This is the container holding both the input and the dropdown menu
      .within(() => {
        // Cypress is now scoped strictly inside this sibling div
        cy.get('input[role="combobox"]').click();
        cy.contains('div', functionName).click();
      });
  },
);

When(
  'User sets the value of parameter {string} to {string} in the element # {int}',
  (paramName: string, paramValue: string, element: number) => {
    cy.contains('div[role="group"] label', paramName).eq(element).siblings('div').find('input').clear().type(paramValue);
  },
);

Then('Drawer has exactly {int} queued transactions', (txs: number) => {
  // Check for Contract labels
  cy.contains('div[role="group"] label', 'Contract').should('have.length', txs);

  // Check for Function labels
  cy.contains('div[role="group"] label', 'Function').should('have.length', txs);
});
