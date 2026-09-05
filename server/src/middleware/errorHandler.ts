import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';
import { isProduction } from '../config/env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // CSRF error handler
  if (err.code === 'EBADCSRFTOKEN') {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or missing CSRF token',
    };
    res.status(403).json(response);
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid JSON payload',
    };
    res.status(400).json(response);
    return;
  }

  const statusCode = typeof err.status === 'number' ? err.status : typeof err.statusCode === 'number' ? err.statusCode : 500;
  const response: ApiResponse = {
    success: false,
    error: isProduction && statusCode === 500 ? 'Internal server error' : (err.message || 'Internal server error'),
  };

  res.status(statusCode).json(response);
}
