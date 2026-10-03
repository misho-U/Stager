'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminSocialLinksQuery,
  useCreateSocialLink,
  useDeleteSocialLink,
  useUpdateSocialLink,
} from '@/entity/social-link/api/social-link.query';
import {
  socialLinkInputSchema,
  type AdminSocialLink,
  type SocialLinkFormValues,
  type SocialLinkInput,
} from '@/entity/social-link/model/social-link.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';

const EMPTY: SocialLinkFormValues = {
  platform: 'INSTAGRAM',
  url: '',
  label: '',
  order: 0,
  isActive: true,
};

export function useAdminSocialLinks() {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const { data, isLoading, error, refetch } = useQuery(adminSocialLinksQuery());
  const createLink = useCreateSocialLink();
  const updateLink = useUpdateSocialLink();
  const deleteLink = useDeleteSocialLink();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SocialLinkFormValues, unknown, SocialLinkInput>({
    resolver: zodResolver(socialLinkInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY,
  });

  const startCreate = () => {
    setEditingId(null);
    setFormError(null);
    form.reset(EMPTY);
  };

  const startEdit = (link: AdminSocialLink) => {
    setEditingId(link.id);
    setFormError(null);
    form.reset({
      platform: link.platform,
      url: link.url,
      label: link.label ?? '',
      order: link.order,
      isActive: link.isActive,
    });
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        if (editingId) {
          await updateLink.mutateAsync({ id: editingId, input: values });
        } else {
          await createLink.mutateAsync(values);
        }
        startCreate();
      } catch (caught) {
        setFormError(formErrors.message(caught));
        for (const [field, message] of Object.entries(formErrors.fields(caught))) {
          form.setError(field as keyof SocialLinkFormValues, { type: 'server', message });
        }
      }
    },
    // The form's own checks stopped the save. A field may have no message in
    // view (a dropdown, a field on the other language's tab), so say it here
    // rather than leave Save looking dead.
    () => setFormError(formErrors.invalid()),
  );

  /** Quick on/off without opening the editor — the most common change here. */
  const toggleActive = async (link: AdminSocialLink) => {
    setFormError(null);
    try {
      await updateLink.mutateAsync({ id: link.id, input: { isActive: !link.isActive } });
    } catch (caught) {
      setFormError(formErrors.message(caught));
    }
  };

  const remove = async (id: string) => {
    setFormError(null);
    try {
      await deleteLink.mutateAsync(id);
      if (editingId === id) startCreate();
    } catch (caught) {
      setFormError(formErrors.message(caught));
    }
  };

  return {
    links: data?.items ?? [],
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
    isSubmitting: createLink.isPending || updateLink.isPending,
    isDeleting: deleteLink.isPending,
    deletingId: deleteLink.variables ?? null,
    formError,
  };
}
