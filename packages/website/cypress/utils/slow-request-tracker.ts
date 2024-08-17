export const slowRequestTracker = (() => {
  const THRESHOLD = 30000; // 30s in milliseconds
  let slowRequests: string[] = [];

  function trackRequest(req: any) {
    const startTime = performance.now();

    req.on('response', () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > THRESHOLD) {
        slowRequests.push(`🟡 Slow request: ${req.url} took ${duration}ms`);
      }
    });
  }

  function logRequest() {
    if (slowRequests.length > 0) {
      slowRequests.forEach((request) => {
        cy.task('log', request);
      });
      slowRequests = [];
    }
  }

  return {
    trackRequest,
    logRequest,
  };
})();
