'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  siteSettingsQuery,
  useUpdateSiteSettings,
} from '@/entity/site-setting/api/site-setting.query';
import {
  siteSettingUpdateInputSchema,
  type AdminSiteSetting,
  type SiteSettingFormValues,
  type SiteSettingUpdateInput,
} from '@/entity/site-setting/model/site-setting.model';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

function toFormValues(settings: AdminSiteSetting): SiteSettingFormValues {
  return {
    logoMediaId: settings.logoMediaId,
    logoLightMediaId: settings.logoLightMediaId,
    contactEmail: settings.contactEmail ?? '',
    phone: settings.phone ?? '',
    inquiryInboxEmail: settings.inquiryInboxEmail ?? '',
    translations: {
      KA: {
        siteName: settings.translations.KA.siteName,
        tagline: settings.translations.KA.tagline,
        address: settings.translations.KA.address,
        footerText: settings.translations.KA.footerText,
        metaTitle: settings.translations.KA.metaTitle ?? '',
        metaDescription: settings.translations.KA.metaDescription ?? '',
        ogMediaId: settings.translations.KA.ogMediaId,
      },
      EN: {
        siteName: settings.translations.EN.siteName,
        tagline: settings.translations.EN.tagline,
        address: settings.translations.EN.address,
        footerText: settings.translations.EN.footerText,
        metaTitle: settings.translations.EN.metaTitle ?? '',
        metaDescription: settings.translations.EN.metaDescription ?? '',
        ogMediaId: settings.translations.EN.ogMediaId,
      },
    },
  };
}

const EMPTY: SiteSettingFormValues = {
  logoMediaId: null,
  logoLightMediaId: null,
  contactEmail: '',
  phone: '',
  inquiryInboxEmail: '',
  translations: {
    KA: {
      siteName: 'STAGER',
      tagline: '',
      address: '',
      footerText: '',
      metaTitle: '',
      metaDescription: '',
      ogMediaId: null,
    },
    EN: {
      siteName: 'STAGER',
      tagline: '',
      address: '',
      footerText: '',
      metaTitle: '',
      metaDescription: '',
      ogMediaId: null,
    },
  },
};

export function useAdminSettings() {
  const settingsQuery = useQuery(siteSettingsQuery());
  const updateSettings = useUpdateSiteSettings();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const form = useForm<SiteSettingFormValues, unknown, SiteSettingUpdateInput>({
    resolver: zodResolver(siteSettingUpdateInputSchema),
    defaultValues: EMPTY,
  });

  const { reset } = form;

  useEffect(() => {
    if (settingsQuery.data) reset(toFormValues(settingsQuery.data));
  }, [settingsQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSaved(false);
    try {
      await updateSettings.mutateAsync(values);
      setIsSaved(true);
    } catch (caught) {
      setSubmitError(toFormErrorMessage(caught));
    }
  });

  return {
    form,
    onSubmit,
    isLoading: settingsQuery.isLoading,
    loadError: settingsQuery.error ? toFormErrorMessage(settingsQuery.error) : null,
    isSubmitting: updateSettings.isPending,
    submitError,
    isSaved,
  };
}
