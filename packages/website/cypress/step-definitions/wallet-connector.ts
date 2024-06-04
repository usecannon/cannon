import { Given } from '@badeball/cypress-cucumber-preprocessor';

Given('Wallet is connected', () => {
  cy.window().then((window) => {
    window.localStorage.setItem('e2e-wallet-connected', 'true');
  });
});
