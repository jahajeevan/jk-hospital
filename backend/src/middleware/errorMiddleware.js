export const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  req.log?.error({ err, requestId: req.requestId }, 'request failed');
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server error',
    errors: err.errors || err.details || undefined,
    requestId: res.locals.requestId,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};
