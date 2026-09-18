'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminServiceQuery,
  useCreateService,
  useUpdateService,
} from '@/entity/service/api/service.query';
import {
  serviceInputSchema,
  type AdminService,
  type ServiceFormValues,
  type ServiceInput,
} from '@/entity/service/model/service.model';
import { toFieldErrors, toFormErrorMessage } from '@/shared/lib/form-errors';

const EMPTY_TRANSLATION = {
  title: '',
  shortDescription: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
  ogMediaId: null,
};

export const EMPTY_SERVICE: ServiceFormValues = {
  slug: '',
  icon: '',
  coverMediaId: null,
  status: 'DRAFT',
  order: 0,
  translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
};

function toFormValues(service: AdminService): ServiceFormValues {
  return {
    slug: service.slug,
    icon: service.icon ?? '',
    coverMediaId: service.coverMediaId,
    status: service.status,
    order: service.order,
    translations: {
      KA: {
        title: service.translations.KA.title,
        shortDescription: service.translations.KA.shortDescription,
        body: service.translations.KA.body,
        metaTitle: service.translations.KA.metaTitle ?? '',
        metaDescription: service.translations.KA.metaDescription ?? '',
        ogMediaId: service.translations.KA.ogMediaId,
      },
      EN: {
        title: service.translations.EN.title,
        shortDescription: service.translations.EN.shortDescription,
        body: service.translations.EN.body,
        metaTitle: service.translations.EN.metaTitle ?? '',
        metaDescription: service.translations.EN.metaDescription ?? '',
        ogMediaId: service.translations.EN.ogMediaId,
      },
    },
  };
}

export function useAdminServiceForm({ serviceId }: { serviceId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(serviceId);

  const serviceQuery = useQuery({ ...adminServiceQuery(serviceId ?? ''), enabled: isEdit });
  const createService = useCreateService();
  const updateService = useUpdateService();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ServiceFormValues, unknown, ServiceInput>({
    resolver: zodResolver(serviceInputSchema),
    defaultValues: EMPTY_SERVICE,
  });

  const { reset } = form;

  useEffect(() => {
    if (serviceQuery.data) reset(toFormValues(serviceQuery.data));
  }, [serviceQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (serviceId) {
        await updateService.mutateAsync({ id: serviceId, input: values });
      } else {
        await createService.mutateAsync(values);
      }
      router.push('/admin/services');
      router.refresh();
    } catch (caught) {
      setSubmitError(toFormErrorMessage(caught));
      for (const [field, message] of Object.entries(toFieldErrors(caught))) {
        form.setError(field as keyof ServiceFormValues, { type: 'server', message });
      }
    }
  });

  return {
    form,
    onSubmit,
    isEdit,
    isLoading: isEdit && serviceQuery.isLoading,
    isSubmitting: createService.isPending || updateService.isPending,
    submitError,
  };
}
