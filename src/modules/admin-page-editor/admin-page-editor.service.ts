'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { adminPageQuery, useUpdatePage } from '@/entity/page/api/page.query';
import {
  pageUpdateInputSchema,
  type AdminPage,
  type PageUpdateInput,
} from '@/entity/page/model/page.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';
import type { PageKey } from '@/shared/types/enums';

/** Raw form values, before the schema trims them and applies defaults. */
type PageFormValues = z.input<typeof pageUpdateInputSchema>;

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
    // Section ids come from the server and are never edited; the schema drops
    // everything else the section carries.
    sections: page.sections.map((section) => ({
      id: section.id,
      isVisible: section.isVisible,
      mediaId: section.mediaId,
      translations: {
        KA: { ...section.translations.KA },
        EN: { ...section.translations.EN },
      },
    })),
  };
}

const EMPTY_TRANSLATION = { title: '', metaTitle: '', metaDescription: '' };

export function useAdminPageEditor(pageKey: PageKey) {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const pageQuery = useQuery(adminPageQuery(pageKey));
  const updatePage = useUpdatePage();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Validated with the same schema the API applies, so a heading that is too
  // long is marked on its field instead of failing the save with no message.
  const form = useForm<PageFormValues, unknown, PageUpdateInput>({
    resolver: zodResolver(pageUpdateInputSchema, { error: validationErrorMap }),
    defaultValues: { translations: { KA: EMPTY_TRANSLATION, EN: EMPTY_TRANSLATION }, sections: [] },
  });

  const { reset } = form;

  useEffect(() => {
    if (pageQuery.data) reset(toFormValues(pageQuery.data));
  }, [pageQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (payload) => {
    setSubmitError(null);
    setIsSaved(false);

    try {
      await updatePage.mutateAsync({ key: pageKey, input: payload });
      setIsSaved(true);
    } catch (caught) {
      setSubmitError(formErrors.message(caught));
    }
  });

  return {
    form,
    onSubmit,
    sections: pageQuery.data?.sections ?? [],
    isLoading: pageQuery.isLoading,
    loadError: pageQuery.error ? formErrors.message(pageQuery.error) : null,
    isSubmitting: updatePage.isPending,
    submitError,
    isSaved,
  };
}
