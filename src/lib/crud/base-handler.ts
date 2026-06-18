import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { 
  successResponse, 
  createdResponse, 
  notFoundResponse,
  validationErrorResponse 
} from '@/lib/utils/api-response';
import { paginationSchema } from '@/lib/validators/common';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { withRateLimit, apiLimiter } from '@/lib/middleware/rate-limiter';

export interface CRUDOptions<T> {
  model: Prisma.ModelName;
  createSchema?: z.ZodSchema<any>;
  updateSchema?: z.ZodSchema<any>;
  searchFields?: string[];
  defaultSort?: Record<string, 'asc' | 'desc'>;
  includeRelations?: Record<string, any>;
  softDelete?: boolean;
  uniqueField?: string;
}

export abstract class BaseCRUDHandler<T> {
  protected options: CRUDOptions<T>;
  protected model: any;

  constructor(options: CRUDOptions<T>) {
    this.options = {
      softDelete: true,
      uniqueField: 'id',
      ...options
    };
    this.model = (db as any)[options.model.toLowerCase()];
  }

  /**
   * List all records with pagination
   */
  list = withRateLimit(
    withErrorHandler(async (request: NextRequest) => {
      const { searchParams } = new URL(request.url);
      const params = paginationSchema.parse(Object.fromEntries(searchParams));
      const { page, limit, sortBy, sortOrder } = params;
      
      const search = searchParams.get('search');
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (this.options.softDelete) {
        where.deletedAt = null;
      }

      // Add search conditions
      if (search && this.options.searchFields) {
        where.OR = this.options.searchFields.map(field => ({
          [field]: { contains: search, mode: 'insensitive' }
        }));
      }

      // Build orderBy
      const orderBy = sortBy 
        ? { [sortBy]: sortOrder }
        : this.options.defaultSort || { createdAt: 'desc' };

      // Execute query
      const [items, total] = await Promise.all([
        this.model.findMany({
          where,
          include: this.options.includeRelations,
          orderBy,
          skip,
          take: limit,
        }),
        this.model.count({ where }),
      ]);

      return successResponse({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }),
    apiLimiter
  );

  /**
   * Get a single record by ID
   */
  get = withRateLimit(
    withErrorHandler(async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const { id } = await params;
      const where: any = { [this.options.uniqueField!]: id };
      
      if (this.options.softDelete) {
        where.deletedAt = null;
      }

      const item = await this.model.findUnique({
        where,
        include: this.options.includeRelations,
      });

      if (!item) {
        return notFoundResponse('Record');
      }

      return successResponse(item);
    }),
    apiLimiter
  );

  /**
   * Create a new record
   */
  create = withRateLimit(
    withErrorHandler(async (request: NextRequest) => {
      const body = await request.json();

      // Validate input if schema provided
      if (this.options.createSchema) {
        const validation = this.options.createSchema.safeParse(body);
        if (!validation.success) {
          const errors = validation.error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          );
          return validationErrorResponse(errors);
        }
        body.data = validation.data;
      }

      // Allow subclasses to transform data before create
      const data = await this.beforeCreate(body.data || body);

      const item = await this.model.create({
        data,
        include: this.options.includeRelations,
      });

      // Allow subclasses to perform actions after create
      await this.afterCreate(item);

      return createdResponse(item, 'Created successfully');
    }),
    apiLimiter
  );

  /**
   * Update a record
   */
  update = withRateLimit(
    withErrorHandler(async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const { id } = await params;
      const body = await request.json();

      // Check if record exists
      const where: any = { [this.options.uniqueField!]: id };
      if (this.options.softDelete) {
        where.deletedAt = null;
      }

      const existing = await this.model.findUnique({ where });
      if (!existing) {
        return notFoundResponse('Record');
      }

      // Validate input if schema provided
      if (this.options.updateSchema) {
        const validation = this.options.updateSchema.safeParse(body);
        if (!validation.success) {
          const errors = validation.error.errors.map(e => 
            `${e.path.join('.')}: ${e.message}`
          );
          return validationErrorResponse(errors);
        }
        body.data = validation.data;
      }

      // Allow subclasses to transform data before update
      const data = await this.beforeUpdate(existing, body.data || body);

      const item = await this.model.update({
        where: { [this.options.uniqueField!]: id },
        data,
        include: this.options.includeRelations,
      });

      // Allow subclasses to perform actions after update
      await this.afterUpdate(item);

      return successResponse(item, 'Updated successfully');
    }),
    apiLimiter
  );

  /**
   * Delete a record (soft or hard delete based on options)
   */
  delete = withRateLimit(
    withErrorHandler(async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const { id } = await params;

      // Check if record exists
      const where: any = { [this.options.uniqueField!]: id };
      if (this.options.softDelete) {
        where.deletedAt = null;
      }

      const existing = await this.model.findUnique({ where });
      if (!existing) {
        return notFoundResponse('Record');
      }

      // Allow subclasses to check before delete
      await this.beforeDelete(existing);

      if (this.options.softDelete) {
        // Soft delete
        await this.model.update({
          where: { [this.options.uniqueField!]: id },
          data: { deletedAt: new Date() },
        });
      } else {
        // Hard delete
        await this.model.delete({
          where: { [this.options.uniqueField!]: id },
        });
      }

      // Allow subclasses to perform actions after delete
      await this.afterDelete(existing);

      return successResponse(null, 'Deleted successfully');
    }),
    apiLimiter
  );

  // Hooks for subclasses to override
  protected async beforeCreate(data: any): Promise<any> {
    return data;
  }

  protected async afterCreate(item: any): Promise<void> {
    // Override in subclass if needed
  }

  protected async beforeUpdate(existing: any, data: any): Promise<any> {
    return data;
  }

  protected async afterUpdate(item: any): Promise<void> {
    // Override in subclass if needed
  }

  protected async beforeDelete(item: any): Promise<void> {
    // Override in subclass if needed
  }

  protected async afterDelete(item: any): Promise<void> {
    // Override in subclass if needed
  }
}
