'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminStatsQuery,
  useCreateStat,
  useDeleteStat,
  useUpdateStat,
} from '@/entity/stat/api/stat.query';
import {
  statInputSchema,
  type AdminStat,
  type StatFormValues,
  type StatInput,
} from '@/entity/stat/model/stat.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';

const EMPTY: StatFormValues = {
  value: '',
  order: 0,
  isActive: true,
  translations: { KA: { label: '' }, EN: { label: '' } },
};

/**
 * The company in figures, edited in place like social links: a figure and a
 * caption in each language is less than a page of its own.
 */
export function useAdminCompanyStats() {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const { data, isLoading, error, refetch } = useQuery(adminStatsQuery());
  const createStat = useCreateStat();
  const updateStat = useUpdateStat();
  const deleteStat = useDeleteStat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<StatFormValues, unknown, StatInput>({
    resolver: zodResolver(statInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY,
  });

  const startCreate = () => {
    setEditingId(null);
    setFormError(null);
    form.reset(EMPTY);
  };

  const startEdit = (stat: AdminStat) => {
    setEditingId(stat.id);
    setFormError(null);
    form.reset({
      value: stat.value,
      order: stat.order,
      isActive: stat.isActive,
      translations: stat.translations,
    });
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        if (editingId) {
          await updateStat.mutateAsync({ id: editingId, input: values });
        } else {
          await createStat.mutateAsync(values);
        }
        startCreate();
      } catch (caught) {
        setFormError(formErrors.message(caught));
        for (const [field, message] of Object.entries(formErrors.fields(caught))) {
          form.setError(field as keyof StatFormValues, { type: 'server', message });
        }
      }
    },
    () => setFormError(formErrors.invalid()),
  );

  /** Hide a figure without losing it: the count may be right again next year. */
  const toggleActive = async (stat: AdminStat) => {
    setFormError(null);
    try {
      await updateStat.mutateAsync({ id: stat.id, input: { isActive: !stat.isActive } });
    } catch (caught) {
      setFormError(formErrors.message(caught));
    }
  };

  const remove = async (id: string) => {
    setFormError(null);
    try {
      await deleteStat.mutateAsync(id);
      if (editingId === id) startCreate();
    } catch (caught) {
      setFormError(formErrors.message(caught));
    }
  };

  return {
    stats: data?.items ?? [],
    isLoading,
    // Only while nothing has loaded; a failed refresh keeps what is on screen.
    loadError: error && !data ? formErrors.message(error) : null,
    retry: () => void refetch(),
    form,
    onSubmit,
    editingId,
    startCreate,
    startEdit,
    toggleActive,
    remove,
    isSubmitting: createStat.isPending || updateStat.isPending,
    isDeleting: deleteStat.isPending,
    deletingId: deleteStat.variables ?? null,
    formError,
  };
}
