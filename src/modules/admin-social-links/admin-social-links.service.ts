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
import { toFieldErrors, toFormErrorMessage } from '@/shared/lib/form-errors';

const EMPTY: SocialLinkFormValues = {
  platform: 'INSTAGRAM',
  url: '',
  label: '',
  order: 0,
  isActive: true,
};

export function useAdminSocialLinks() {
  const { data, isLoading, error } = useQuery(adminSocialLinksQuery());
  const createLink = useCreateSocialLink();
  const updateLink = useUpdateSocialLink();
  const deleteLink = useDeleteSocialLink();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SocialLinkFormValues, unknown, SocialLinkInput>({
    resolver: zodResolver(socialLinkInputSchema),
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

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (editingId) {
        await updateLink.mutateAsync({ id: editingId, input: values });
      } else {
        await createLink.mutateAsync(values);
      }
      startCreate();
    } catch (caught) {
      setFormError(toFormErrorMessage(caught));
      for (const [field, message] of Object.entries(toFieldErrors(caught))) {
        form.setError(field as keyof SocialLinkFormValues, { type: 'server', message });
      }
    }
  });

  /** Quick on/off without opening the editor — the most common change here. */
  const toggleActive = async (link: AdminSocialLink) => {
    setFormError(null);
    try {
      await updateLink.mutateAsync({ id: link.id, input: { isActive: !link.isActive } });
    } catch (caught) {
      setFormError(toFormErrorMessage(caught));
    }
  };

  const remove = async (id: string) => {
    setFormError(null);
    try {
      await deleteLink.mutateAsync(id);
      if (editingId === id) startCreate();
    } catch (caught) {
      setFormError(toFormErrorMessage(caught));
    }
  };

  return {
    links: data?.items ?? [],
    isLoading,
    loadError: error ? toFormErrorMessage(error) : null,
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
