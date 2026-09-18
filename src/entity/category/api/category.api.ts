import {
  adminCategorySchema,
  type AdminCategory,
  type CategoryInput,
  type CategoryUpdateInput,
} from '@/entity/category/model/category.model';
import { createCrudApi } from '@/shared/lib/crud-resource';

export const categoryApi = createCrudApi<AdminCategory, CategoryInput, CategoryUpdateInput>({
  basePath: '/api/admin/categories',
  recordSchema: adminCategorySchema,
});
