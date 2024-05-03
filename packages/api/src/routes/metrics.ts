import express from 'express';
import prometheus from 'express-prom-bundle';
import { config } from '../config';
import { NotFoundError } from '../errors';

const metrics = express.Router();

metrics.get('/metrics', (req, res, next) => {
  const password = req.headers['x-password'];

  if (config.METRICS_PASSWORD && password !== config.METRICS_PASSWORD) {
    throw new NotFoundError();
  }

  next();
});

const metricsMiddleware = prometheus({
  customLabels: { serviceName: 'cannon-api' },
  includeMethod: true,
  includePath: true,
});

metrics.use(metricsMiddleware);

export { metrics };
