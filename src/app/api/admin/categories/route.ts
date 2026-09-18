import { createCollectionRoutes } from '@/app/api/_lib/crud-route';
import {
  createCategory,
  listAdminCategories,
} from '@/app/api/_lib/repositories/category.repository';
import {
  categoryInputSchema,
  type AdminCategory,
  type CategoryInput,
} from '@/entity/category/model/category.model';

export const dynamic = 'force-dynamic';

export const { GET, POST } = createCollectionRoutes<AdminCategory, CategoryInput>({
  entity: 'category',
  entityType: 'Category',
  inputSchema: categoryInputSchema,
  list: listAdminCategories,
  create: createCategory,
  idOf: (category) => category.id,
  cacheKeyOf: (category) => category.slug,
  auditSummary: (category) => ({ slug: category.slug }),
  conflict: { field: 'slug', message: 'A category with this slug already exists' },
});
