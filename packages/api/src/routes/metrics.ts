import express from 'express';
import prometheus from 'express-prom-bundle';
import { config } from '../config';

const metrics = express.Router();

const metricsMiddleware = prometheus({
  customLabels: { serviceName: 'cannon-api' },
  includeMethod: true,
  includePath: true,
  metricsPath: `/metrics/${config.METRICS_PATH}`,
  normalizePath: [['^/packages/.*', '/customer/#packageName']],
});

metrics.use(metricsMiddleware);

export { metrics };
