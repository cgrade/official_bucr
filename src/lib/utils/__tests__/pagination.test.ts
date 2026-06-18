import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getPaginationParams,
  calculatePagination,
  paginatedResponse,
  getPrismaSkipTake,
} from '../pagination';

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should parse valid pagination params', () => {
      const request = new NextRequest('http://localhost:3000/api/test?page=2&limit=10&sortBy=createdAt&sortOrder=asc');
      const params = getPaginationParams(request);

      expect(params).toEqual({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
    });

    it('should use defaults for missing params', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const params = getPaginationParams(request);

      expect(params).toEqual({
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      });
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination metadata correctly', () => {
      const result = calculatePagination(2, 10, 45);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle first page', () => {
      const result = calculatePagination(1, 10, 25);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle last page', () => {
      const result = calculatePagination(3, 10, 25);

      expect(result).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle single page', () => {
      const result = calculatePagination(1, 10, 5);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('paginatedResponse', () => {
    it('should create standardized paginated response', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = paginatedResponse(items, 1, 10, 2);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        items,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should include message if provided', async () => {
      const items = [];
      const response = paginatedResponse(items, 1, 10, 0, 'No items found');
      const data = await response.json();

      expect(data.message).toBe('No items found');
    });
  });

  describe('getPrismaSkipTake', () => {
    it('should calculate skip and take for Prisma', () => {
      expect(getPrismaSkipTake(1, 10)).toEqual({ skip: 0, take: 10 });
      expect(getPrismaSkipTake(2, 10)).toEqual({ skip: 10, take: 10 });
      expect(getPrismaSkipTake(3, 20)).toEqual({ skip: 40, take: 20 });
    });
  });
});
