'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { adminPageQuery, useUpdatePage } from '@/entity/page/api/page.query';
import {
  pageUpdateInputSchema,
  type AdminPage,
  type PageUpdateInput,
} from '@/entity/page/model/page.model';
import { toFormErrorMessage } from '@/shared/lib/form-errors';
import type { PageKey } from '@/shared/types/enums';

type PageFormValues = {
  translations: {
    KA: { title: string; metaTitle: string; metaDescription: string };
    EN: { title: string; metaTitle: string; metaDescription: string };
  };
  sections: Array<{
    id: string;
    key: string;
    isVisible: boolean;
    mediaId: string | null;
    translations: {
      KA: { heading: string; subheading: string; body: string; ctaLabel: string; ctaHref: string };
      EN: { heading: string; subheading: string; body: string; ctaLabel: string; ctaHref: string };
    };
  }>;
};

function toFormValues(page: AdminPage): PageFormValues {
  return {
    translations: {
      KA: {
        title: page.translations.KA.title,
        metaTitle: page.translations.KA.metaTitle ?? '',
        metaDescription: page.translations.KA.metaDescription ?? '',
      },
      EN: {
        title: page.translations.EN.title,
        metaTitle: page.translations.EN.metaTitle ?? '',
        metaDescription: page.translations.EN.metaDescription ?? '',
      },
    },
    sections: page.sections.map((section) => ({
      id: section.id,
      key: section.key,
      isVisible: section.isVisible,
      mediaId: section.mediaId,
      translations: {
        KA: { ...section.translations.KA },
        EN: { ...section.translations.EN },
      },
    })),
  };
}

export function useAdminPageEditor(pageKey: PageKey) {
  const pageQuery = useQuery(adminPageQuery(pageKey));
  const updatePage = useUpdatePage();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // The payload shape is validated server-side; the form is a plain object here
  // because section ids and keys come from the server and are never edited.
  const form = useForm<PageFormValues>({
    defaultValues: { translations: { KA: { title: '', metaTitle: '', metaDescription: '' }, EN: { title: '', metaTitle: '', metaDescription: '' } }, sections: [] },
  });

  const { reset } = form;

  useEffect(() => {
    if (pageQuery.data) reset(toFormValues(pageQuery.data));
  }, [pageQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSaved(false);

    const payload: PageUpdateInput = pageUpdateInputSchema.parse({
      translations: values.translations,
      sections: values.sections.map((section) => ({
        id: section.id,
        isVisible: section.isVisible,
        mediaId: section.mediaId,
        translations: section.translations,
      })),
    });

    try {
      await updatePage.mutateAsync({ key: pageKey, input: payload });
      setIsSaved(true);
    } catch (caught) {
      setSubmitError(toFormErrorMessage(caught));
    }
  });

  return {
    form,
    onSubmit,
    sections: pageQuery.data?.sections ?? [],
    isLoading: pageQuery.isLoading,
    loadError: pageQuery.error ? toFormErrorMessage(pageQuery.error) : null,
    isSubmitting: updatePage.isPending,
    submitError,
    isSaved,
  };
}
