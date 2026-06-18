import { NextRequest } from 'next/server';
import { paginationSchema } from '@/lib/validators/common';
import { successResponse } from './api-response';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from request
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  return paginationSchema.parse(Object.fromEntries(searchParams));
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Create standardized paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
) {
  return successResponse<PaginatedResponse<T>>({
    items,
    pagination: calculatePagination(page, limit, total),
  }, message);
}

/**
 * Helper for Prisma pagination
 */
export function getPrismaSkipTake(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
