'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { adminCategoriesQuery } from '@/entity/category/api/category.query';
import {
  adminInsightQuery,
  useCreateInsight,
  useUpdateInsight,
} from '@/entity/insight/api/insight.query';
import {
  insightInputSchema,
  type AdminInsight,
  type InsightFormValues,
  type InsightInput,
} from '@/entity/insight/model/insight.model';
import { adminTeamMembersQuery } from '@/entity/team-member/api/team-member.query';
import { toFieldErrors, toFormErrorMessage } from '@/shared/lib/form-errors';

const EMPTY_TRANSLATION = {
  title: '',
  excerpt: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
  ogMediaId: null,
};

const EMPTY_INSIGHT: InsightFormValues = {
  slug: '',
  coverMediaId: null,
  categoryId: null,
  authorId: null,
  showAuthor: true,
  readingMinutes: null,
  status: 'DRAFT',
  publishedAt: null,
  translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
};

function toFormValues(insight: AdminInsight): InsightFormValues {
  return {
    slug: insight.slug,
    coverMediaId: insight.coverMediaId,
    categoryId: insight.categoryId,
    authorId: insight.authorId,
    showAuthor: insight.showAuthor,
    readingMinutes: insight.readingMinutes,
    status: insight.status,
    publishedAt: insight.publishedAt,
    translations: {
      KA: {
        title: insight.translations.KA.title,
        excerpt: insight.translations.KA.excerpt,
        body: insight.translations.KA.body,
        metaTitle: insight.translations.KA.metaTitle ?? '',
        metaDescription: insight.translations.KA.metaDescription ?? '',
        ogMediaId: insight.translations.KA.ogMediaId,
      },
      EN: {
        title: insight.translations.EN.title,
        excerpt: insight.translations.EN.excerpt,
        body: insight.translations.EN.body,
        metaTitle: insight.translations.EN.metaTitle ?? '',
        metaDescription: insight.translations.EN.metaDescription ?? '',
        ogMediaId: insight.translations.EN.ogMediaId,
      },
    },
  };
}

export function useAdminInsightForm({ insightId }: { insightId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(insightId);

  const insightQuery = useQuery({ ...adminInsightQuery(insightId ?? ''), enabled: isEdit });
  const categoriesQuery = useQuery(adminCategoriesQuery());
  const teamQuery = useQuery(adminTeamMembersQuery());

  const createInsight = useCreateInsight();
  const updateInsight = useUpdateInsight();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<InsightFormValues, unknown, InsightInput>({
    resolver: zodResolver(insightInputSchema),
    defaultValues: EMPTY_INSIGHT,
  });

  const { reset } = form;

  useEffect(() => {
    if (insightQuery.data) reset(toFormValues(insightQuery.data));
  }, [insightQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (insightId) {
        await updateInsight.mutateAsync({ id: insightId, input: values });
      } else {
        await createInsight.mutateAsync(values);
      }
      router.push('/admin/insights');
      router.refresh();
    } catch (caught) {
      setSubmitError(toFormErrorMessage(caught));
      for (const [field, message] of Object.entries(toFieldErrors(caught))) {
        form.setError(field as keyof InsightFormValues, { type: 'server', message });
      }
    }
  });

  return {
    form,
    onSubmit,
    isEdit,
    isLoading: isEdit && insightQuery.isLoading,
    isSubmitting: createInsight.isPending || updateInsight.isPending,
    submitError,
    categoryOptions: (categoriesQuery.data?.items ?? []).map((category) => ({
      value: category.id,
      label: category.translations.KA.name || category.translations.EN.name || category.slug,
    })),
    authorOptions: (teamQuery.data?.items ?? []).map((member) => ({
      value: member.id,
      label: member.translations.KA.name || member.translations.EN.name || member.slug,
    })),
  };
}
