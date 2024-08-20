import 'cypress-xpath';
import { slowRequestTracker } from '../utils/slow-request-tracker';

beforeEach(() => {
  cy.intercept('*', (req) => {
    slowRequestTracker.trackRequest(req);
  });
});

afterEach(() => {
  slowRequestTracker.logRequest();
});
