import { ErrorRequestHandler } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(message = 'Server Error', status = 500) {
    super(message);
    this.status = status;
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', status = 400) {
    super(message);
    this.status = status;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found', status = 404) {
    super(message);
    this.status = status;
  }
}

export const apiErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (!(err instanceof ApiError) || err.status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const error = err instanceof ApiError ? err : new ApiError();

  res.status(error.status);
  res.json({ status: error.status, error: error.message });
};
