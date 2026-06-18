import { NextResponse } from 'next/server';

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export function successResponse<T>(
  data: T,
  message?: string,
  meta?: ApiResponse['meta'],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta,
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, undefined, 201);
}

export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse<null>> {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse<null>> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiResponse<null>> {
  return errorResponse(message, 403);
}

export function validationErrorResponse(
  errors: string | string[]
): NextResponse<ApiResponse<null>> {
  const message = Array.isArray(errors) ? errors.join(', ') : errors;
  return errorResponse(message, 422);
}

export function serverErrorResponse(
  message: string = 'Internal server error'
): NextResponse<ApiResponse<null>> {
  return errorResponse(message, 500);
}
