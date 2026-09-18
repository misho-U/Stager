'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminCategoriesQuery,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/entity/category/api/category.query';
import {
  categoryInputSchema,
  type AdminCategory,
  type CategoryFormValues,
  type CategoryInput,
} from '@/entity/category/model/category.model';
import { toFieldErrors, toFormErrorMessage } from '@/shared/lib/form-errors';

const EMPTY: CategoryFormValues = {
  slug: '',
  order: 0,
  translations: { KA: { name: '' }, EN: { name: '' } },
};

/**
 * Categories are two fields and a slug, so they are edited in place rather than
 * on their own page — a full create/edit route for this much content is more
 * navigation than the task deserves.
 */
export function useAdminCategories() {
  const { data, isLoading, error } = useQuery(adminCategoriesQuery());
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: EMPTY,
  });

  const startCreate = () => {
    setEditingId(null);
    setFormError(null);
    form.reset(EMPTY);
  };

  const startEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    setFormError(null);
    form.reset({
      slug: category.slug,
      order: category.order,
      translations: {
        KA: { name: category.translations.KA.name },
        EN: { name: category.translations.EN.name },
      },
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, input: values });
      } else {
        await createCategory.mutateAsync(values);
      }
      startCreate();
    } catch (caught) {
      setFormError(toFormErrorMessage(caught));
      for (const [field, message] of Object.entries(toFieldErrors(caught))) {
        form.setError(field as keyof CategoryFormValues, { type: 'server', message });
      }
    }
  });

  const remove = async (id: string) => {
    setFormError(null);
    try {
      await deleteCategory.mutateAsync(id);
      if (editingId === id) startCreate();
    } catch (caught) {
      setFormError(toFormErrorMessage(caught));
    }
  };

  return {
    categories: data?.items ?? [],
    isLoading,
    loadError: error ? toFormErrorMessage(error) : null,
    form,
    onSubmit,
    editingId,
    startCreate,
    startEdit,
    remove,
    isSubmitting: createCategory.isPending || updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
    deletingId: deleteCategory.variables ?? null,
    formError,
  };
}
