import { logger } from '../../../config/logger.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { Prisma } from '@prisma/client';

export function globalErrorHandler(err, req, res, next) {
  const statusCode = resolveStatusCode(err);
  const error = resolveError(err, statusCode);
  const requestId = req.id || null;

  logger.error({
    err: {
      name: err.name,
      message: err.message,
      code: err.code,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined,
    },
    req: {
      method: req.method,
      path: req.path,
      requestId,
    },
    response: {
      statusCode,
      errorCode: error.code,
    },
  }, 'Error occurred');

  return res.status(statusCode).json({
    success: false,
    error: {
      ...error,
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
    },
  });
}

function resolveStatusCode(err) {
  if (err instanceof Prisma.PrismaClientValidationError || err?.name === 'ZodError') return 400;
  if (err instanceof Prisma.PrismaClientInitializationError || err instanceof Prisma.PrismaClientRustPanicError) return 503;
  if (err instanceof Prisma.PrismaClientKnownRequestError) return prismaStatusCode(err.code);
  if (err instanceof Prisma.PrismaClientUnknownRequestError && (err.code === '23001' || /RESTRICT/i.test(String(err.message)))) return 409;
  if (err instanceof AppError) return err.statusCode;
  return 500;
}

function resolveError(err, statusCode) {
  if (err?.name === 'ZodError') {
    return {
      code: 'VALIDATION_ERROR',
      category: 'request_validation',
      message: 'A requisição contém dados inválidos. Corrija os campos indicados e tente novamente.',
      details: err.errors.map((item) => ({
        field: item.path.join('.') || 'body',
        issue: item.code,
        message: item.message,
      })),
      retryable: false,
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) return prismaError(err);

  if (err instanceof Prisma.PrismaClientUnknownRequestError && (err.code === '23001' || /RESTRICT/i.test(String(err.message)))) {
    return {
      code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
      category: 'conflict',
      message: 'Não foi possível excluir porque o registro possui itens vinculados. Desative-o em vez de excluir.',
      details: null,
      retryable: false,
    };
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'DATABASE_VALIDATION_ERROR',
      category: 'database_request',
      message: 'A operação não pôde ser executada porque os dados enviados não são compatíveis com a estrutura esperada.',
      details: null,
      retryable: false,
    };
  }

  if (err instanceof Prisma.PrismaClientInitializationError || err instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: 'DATABASE_UNAVAILABLE',
      category: 'infrastructure',
      message: 'O serviço de banco de dados está temporariamente indisponível. Tente novamente mais tarde.',
      details: null,
      retryable: true,
    };
  }

  if (err instanceof AppError) {
    return {
      code: err.code,
      category: categoryForStatus(err.statusCode),
      message: err.message,
      details: err.details || null,
      retryable: err.statusCode >= 500 || err.statusCode === 429,
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    category: 'internal',
    message: 'Ocorreu um erro inesperado ao processar a requisição. Use o requestId para solicitar análise.',
    details: null,
    retryable: statusCode >= 500,
  };
}

function prismaError(err) {
  const definitions = {
    P2002: ['UNIQUE_CONSTRAINT_FAILED', 409, 'conflict', 'Não foi possível concluir porque já existe um registro com os mesmos valores únicos.', false],
    P2003: ['FOREIGN_KEY_CONSTRAINT_FAILED', 400, 'related_resource', 'Não foi possível concluir porque um recurso relacionado não existe ou não pertence ao contexto autorizado.', false],
    P2025: ['RESOURCE_NOT_FOUND', 404, 'not_found', 'O recurso solicitado não foi encontrado ou não está disponível neste contexto.', false],
    P2024: ['DATABASE_POOL_TIMEOUT', 503, 'infrastructure', 'O banco de dados demorou para disponibilizar uma conexão. Tente novamente.', true],
    P2028: ['DATABASE_TRANSACTION_TIMEOUT', 503, 'infrastructure', 'A transação excedeu o tempo permitido. Tente novamente.', true],
    P2034: ['DATABASE_WRITE_CONFLICT', 409, 'conflict', 'A operação entrou em conflito com outra alteração. Recarregue os dados e tente novamente.', true],
  };
  const definition = definitions[err.code] || ['DATABASE_ERROR', 500, 'database', 'Não foi possível concluir a operação no banco de dados. Use o requestId para solicitar análise.', true];
  return {
    code: definition[0],
    category: definition[2],
    message: definition[3],
    details: null,
    retryable: definition[4],
  };
}

function prismaStatusCode(code) {
  const statuses = { P2002: 409, P2003: 400, P2025: 404, P2024: 503, P2028: 503, P2034: 409 };
  return statuses[code] || 500;
}

function categoryForStatus(statusCode) {
  if (statusCode === 400) return 'request';
  if (statusCode === 401) return 'authentication';
  if (statusCode === 403) return 'authorization';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 409) return 'conflict';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode >= 500) return 'internal';
  return 'application';
}

export default globalErrorHandler;
