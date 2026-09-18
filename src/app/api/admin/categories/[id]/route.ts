import { createItemRoutes } from '@/app/api/_lib/crud-route';
import {
  deleteCategory,
  getAdminCategory,
  updateCategory,
} from '@/app/api/_lib/repositories/category.repository';
import {
  categoryUpdateInputSchema,
  type AdminCategory,
  type CategoryUpdateInput,
} from '@/entity/category/model/category.model';

export const dynamic = 'force-dynamic';

export const { GET, PATCH, DELETE } = createItemRoutes<AdminCategory, CategoryUpdateInput>({
  entity: 'category',
  entityType: 'Category',
  updateSchema: categoryUpdateInputSchema,
  get: getAdminCategory,
  update: updateCategory,
  remove: deleteCategory,
  cacheKeyOf: (category) => category.slug,
  auditSummary: (category) => ({ slug: category.slug }),
  notFoundMessage: 'Category not found',
  conflict: { field: 'slug', message: 'A category with this slug already exists' },
});
