import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error in [${req.method}] ${req.originalUrl}:`, err.stack || err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data supplied',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error occurred';

  res.status(statusCode).json({
    error: statusCode === 500 ? 'InternalServerError' : 'RequestError',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};
