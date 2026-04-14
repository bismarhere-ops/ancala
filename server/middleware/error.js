'use strict';

const { ZodError } = require('zod');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, next) {
  // Let the static handler catch SPA/PWA routes first; only API 404s here.
  if (req.path.startsWith('/api/')) {
    return next(new HttpError(404, `No route for ${req.method} ${req.path}`));
  }
  next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request payload',
      details: err.flatten(),
    });
  }

  const status = err.status || 500;
  const body = {
    error: err.code || (status >= 500 ? 'server_error' : 'request_error'),
    message: err.message || 'Unexpected error',
  };
  if (err.details) body.details = err.details;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }
  res.status(status).json(body);
}

module.exports = { HttpError, notFound, errorHandler };
