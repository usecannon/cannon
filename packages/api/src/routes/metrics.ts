import { Router } from 'express';
import basicAuth from 'express-basic-auth';
import prometheus from 'express-prom-bundle';
import { config } from '../config';

const metrics: Router = Router();

metrics.get(
  '/metrics',
  basicAuth({
    users: { [config.METRICS_USER]: config.METRICS_PASSWORD },
  })
);

const metricsMiddleware = prometheus({
  customLabels: { serviceName: 'cannon-api' },
  includeMethod: true,
  includePath: true,
  metricsPath: '/metrics',
  normalizePath: [['^/packages/.*', '/customer/#packageName']],
});

metrics.use(metricsMiddleware);

export { metrics };
