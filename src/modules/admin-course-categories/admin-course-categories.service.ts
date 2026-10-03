'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminCourseCategoriesQuery,
  useCreateCourseCategory,
  useDeleteCourseCategory,
  useUpdateCourseCategory,
} from '@/entity/course-category/api/course-category.query';
import {
  courseCategoryInputSchema,
  type AdminCourseCategory,
  type CourseCategoryFormValues,
  type CourseCategoryInput,
} from '@/entity/course-category/model/course-category.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useSlugAutofill } from '@/shared/lib/use-slug-autofill';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';

const EMPTY: CourseCategoryFormValues = {
  slug: '',
  order: 0,
  translations: { KA: { name: '' }, EN: { name: '' } },
};

/**
 * Edited in place, as article categories are: a name in each language and a
 * slug is less than a page of its own.
 */
export function useAdminCourseCategories() {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const { data, isLoading, error, refetch } = useQuery(adminCourseCategoriesQuery());
  const createCategory = useCreateCourseCategory();
  const updateCategory = useUpdateCourseCategory();
  const deleteCategory = useDeleteCourseCategory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CourseCategoryFormValues, unknown, CourseCategoryInput>({
    resolver: zodResolver(courseCategoryInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY,
  });

  // While adding, the slug follows the English name until it is edited by
  // hand; never while editing a saved category (use-slug-autofill.ts).
  const setSlug = useCallback(
    (slug: string) =>
      form.setValue('slug', slug, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    [form],
  );
  const slugAutofill = useSlugAutofill({ enabled: editingId === null, setSlug });

  const startCreate = () => {
    setEditingId(null);
    setFormError(null);
    form.reset(EMPTY);
    slugAutofill.restart();
  };

  const startEdit = (category: AdminCourseCategory) => {
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

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        if (editingId) {
          await updateCategory.mutateAsync({ id: editingId, input: values });
        } else {
          await createCategory.mutateAsync(values);
        }
        startCreate();
      } catch (caught) {
        setFormError(formErrors.message(caught));
        for (const [field, message] of Object.entries(formErrors.fields(caught))) {
          form.setError(field as keyof CourseCategoryFormValues, { type: 'server', message });
        }
      }
    },
    // The form's own checks stopped the save. A field may have no message in
    // view (a dropdown, a field on the other language's tab), so say it here
    // rather than leave Save looking dead.
    () => setFormError(formErrors.invalid()),
  );

  const remove = async (id: string) => {
    setFormError(null);
    try {
      await deleteCategory.mutateAsync(id);
      if (editingId === id) startCreate();
    } catch (caught) {
      setFormError(formErrors.message(caught));
    }
  };

  return {
    categories: data?.items ?? [],
    isLoading,
    // Only while nothing has loaded; a failed refresh keeps what is on screen.
    loadError: error && !data ? formErrors.message(error) : null,
    retry: () => void refetch(),
    form,
    onSubmit,
    editingId,
    slugAutofill,
    startCreate,
    startEdit,
    remove,
    isSubmitting: createCategory.isPending || updateCategory.isPending,
    isDeleting: deleteCategory.isPending,
    deletingId: deleteCategory.variables ?? null,
    formError,
  };
}
