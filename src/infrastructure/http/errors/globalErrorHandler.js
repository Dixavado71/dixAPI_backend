import { logger } from '../../../config/logger.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../../shared/errors/AppError.js';
import { Prisma } from '@prisma/client';

export function globalErrorHandler(err, req, res, next) {
  logger.error({
    err: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
    },
  }, 'Error occurred');

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    },
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002':
      return res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_FAILED',
          message: 'A record with this value already exists',
        },
      });

    case 'P2025':
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Record not found',
        },
      });

    case 'P2003':
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
          message: 'Related record not found',
        },
      });

    default:
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
        },
      });
  }
}

export default globalErrorHandler;
