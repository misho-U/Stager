import { categoryApi } from '@/entity/category/api/category.api';
import type {
  AdminCategory,
  CategoryInput,
  CategoryUpdateInput,
} from '@/entity/category/model/category.model';
import { createCrudQueries } from '@/shared/lib/crud-resource';

export const {
  keys: categoryKeys,
  listQuery: adminCategoriesQuery,
  detailQuery: adminCategoryQuery,
  useCreate: useCreateCategory,
  useUpdate: useUpdateCategory,
  useDelete: useDeleteCategory,
} = createCrudQueries<AdminCategory, CategoryInput, CategoryUpdateInput>({
  resource: 'categories',
  api: categoryApi,
});
