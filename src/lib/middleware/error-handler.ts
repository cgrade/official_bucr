import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/utils/api-response';

/**
 * Wraps API route handlers with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (request: NextRequest, ...args: T) => Promise<R>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse | R> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error('API Error:', {
        url: request.url,
        method: request.method,
        error,
      });

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return validationErrorResponse(errors);
      }

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            return errorResponse('A record with this value already exists', 409);
          case 'P2025':
            return errorResponse('Record not found', 404);
          case 'P2003':
            return errorResponse('Foreign key constraint failed', 400);
          default:
            return errorResponse('Database operation failed', 400);
        }
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        return errorResponse('Invalid data provided', 400);
      }

      // Handle custom errors
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return errorResponse(error.message, 401);
        }
        if (error.message.includes('Forbidden')) {
          return errorResponse(error.message, 403);
        }
        if (error.message.includes('Not found')) {
          return errorResponse(error.message, 404);
        }
      }

      // Default server error
      return serverErrorResponse('An unexpected error occurred');
    }
  };
}

/**
 * Async wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (request: NextRequest, ...args: T) => Promise<R>
) {
  return withErrorHandler(fn);
}
