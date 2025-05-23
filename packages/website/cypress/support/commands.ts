import 'cypress-xpath';
import { slowRequestTracker } from '../utils/slow-request-tracker';
import '@cypress/code-coverage/support';

beforeEach(() => {
  cy.intercept('*', (req) => {
    slowRequestTracker.trackRequest(req);
  });
});

afterEach(() => {
  slowRequestTracker.logRequest();
});

Cypress.on('uncaught:exception', (/*err, runnable*/) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
