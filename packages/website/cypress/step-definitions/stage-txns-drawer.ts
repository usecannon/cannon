import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('User types and select the safe {string}', (text: string) => {
  const [chainId, address] = text.split(':');

  // Type chain ID in the first input
  cy.get('[data-testid="safe-chain-input"]').type(chainId);

  // Type address in the second input
  cy.get('[data-testid="safe-address-input"]').type(address);
  cy.get('[data-testid="safe-address-input"]').type('{enter}');

  // Verify the selected safe is displayed correctly
  cy.get('[data-testid="selected-safe"]').should(($container) => {
    expect($container).to.exist;
    expect($container).to.contain(address.slice(0, 6));
    expect($container).to.contain(address.slice(-4));
    expect($container).to.contain(chainId);
  });
});

When('User closes the queue txns drawer', () => {
  cy.xpath('//div[@role="dialog"]//button[@aria-label="Close"]').click();
});

When(
  'User selects and clicks on the contract with name {string} of the element # {int}',
  (contractName: string, element: number) => {
    cy.xpath(
      `(//div[@role='group']//label[contains(text(), 'Contract')])[${element}]/following-sibling::div//input[@role='combobox']`
    ).click();

    // Then, click on the contract option within the opened dropdown of the second container
    cy.xpath(
      `(//div[@role='group']//label[contains(text(), 'Contract')])[${element}]/following-sibling::div//div[contains(text(), '${contractName}')]`
    ).click();
  }
);

When(
  'User selects and clicks on the function with name {string} of the element # {int}',
  (contractName: string, element: number) => {
    cy.xpath(
      `(//div[@role='group']//label[contains(text(), 'Function')])[${element}]/following-sibling::div//input[@role='combobox']`
    ).click();

    // Then, click on the Function option within the opened dropdown of the second container
    cy.xpath(
      `(//div[@role='group']//label[contains(text(), 'Function')])[${element}]/following-sibling::div//div[contains(text(), '${contractName}')]`
    ).click();
  }
);

When(
  'User sets the value of parameter {string} to {string} in the element # {int}',
  (paramName: string, paramValue: string, element: number) => {
    // Locate the second element with the specified parameter name and set its value
    cy.xpath(`(//div[@role='group']//label[contains(., '${paramName}')]/following-sibling::div//input)[${element}]`)
      .clear()
      .type(paramValue);
  }
);

Then('Drawer has exactly {int} queued transactions', (txs: number) => {
  // Check for Contract labels
  cy.xpath('//label[contains(text(), "Contract")]').should('have.length', txs);

  // Check for Function labels
  cy.xpath('//label[contains(text(), "Function")]').should('have.length', txs);
});
