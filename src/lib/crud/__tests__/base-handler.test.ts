import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { BaseCRUDHandler } from '../base-handler';
import { z } from 'zod';

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  db: {
    testmodel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

// Test implementation of BaseCRUDHandler
class TestHandler extends BaseCRUDHandler<any> {
  constructor() {
    super({
      model: 'TestModel' as any,
      createSchema: z.object({
        name: z.string().min(1),
        value: z.number(),
      }),
      updateSchema: z.object({
        name: z.string().min(1).optional(),
        value: z.number().optional(),
      }),
      searchFields: ['name'],
      defaultSort: { createdAt: 'desc' },
    });
  }
}

describe('BaseCRUDHandler', () => {
  let handler: TestHandler;
  const mockModel = db.testmodel;

  beforeEach(() => {
    handler = new TestHandler();
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated results', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      mockModel.findMany.mockResolvedValue(mockItems);
      mockModel.count.mockResolvedValue(10);

      const request = new NextRequest('http://localhost:3000/api/test?page=1&limit=2');
      const response = await handler.list(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.items).toEqual(mockItems);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 10,
        totalPages: 5,
      });
    });

    it('should handle search parameter', async () => {
      mockModel.findMany.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/test?search=test');
      await handler.list(request);

      expect(mockModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ name: { contains: 'test', mode: 'insensitive' } }],
          }),
        })
      );
    });
  });

  describe('get', () => {
    it('should return a single item', async () => {
      const mockItem = { id: '123', name: 'Test Item' };
      mockModel.findUnique.mockResolvedValue(mockItem);

      const request = new NextRequest('http://localhost:3000/api/test/123');
      const params = Promise.resolve({ id: '123' });
      const response = await handler.get(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockItem);
    });

    it('should return 404 for non-existent item', async () => {
      mockModel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/test/999');
      const params = Promise.resolve({ id: '999' });
      const response = await handler.get(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Record not found');
    });
  });

  describe('create', () => {
    it('should create a new item with validation', async () => {
      const newItem = { id: '456', name: 'New Item', value: 100 };
      mockModel.create.mockResolvedValue(newItem);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Item', value: 100 }),
      });

      const response = await handler.create(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(newItem);
      expect(data.message).toBe('Created successfully');
    });

    it('should reject invalid input', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: '', value: 'not-a-number' }),
      });

      const response = await handler.create(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update an existing item', async () => {
      const existingItem = { id: '123', name: 'Old Name', value: 50 };
      const updatedItem = { id: '123', name: 'New Name', value: 50 };

      mockModel.findUnique.mockResolvedValue(existingItem);
      mockModel.update.mockResolvedValue(updatedItem);

      const request = new NextRequest('http://localhost:3000/api/test/123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const params = Promise.resolve({ id: '123' });
      const response = await handler.update(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedItem);
      expect(data.message).toBe('Updated successfully');
    });

    it('should return 404 for non-existent item', async () => {
      mockModel.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/test/999', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const params = Promise.resolve({ id: '999' });
      const response = await handler.update(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Record not found');
    });
  });

  describe('delete', () => {
    it('should soft delete by default', async () => {
      const existingItem = { id: '123', name: 'To Delete' };
      mockModel.findUnique.mockResolvedValue(existingItem);

      const request = new NextRequest('http://localhost:3000/api/test/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: '123' });
      const response = await handler.delete(request, { params });
      const data = await response.json();

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(data.success).toBe(true);
      expect(data.message).toBe('Deleted successfully');
    });

    it('should handle hard delete when configured', async () => {
      const hardDeleteHandler = new class extends BaseCRUDHandler<any> {
        constructor() {
          super({
            model: 'TestModel' as any,
            softDelete: false,
          });
        }
      };

      const existingItem = { id: '123', name: 'To Delete' };
      mockModel.findUnique.mockResolvedValue(existingItem);

      const request = new NextRequest('http://localhost:3000/api/test/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: '123' });
      await hardDeleteHandler.delete(request, { params });

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });
  });
});
