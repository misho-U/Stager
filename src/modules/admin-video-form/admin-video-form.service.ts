'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { adminVideoQuery, useCreateVideo, useUpdateVideo } from '@/entity/video/api/video.query';
import {
  videoInputSchema,
  type AdminVideo,
  type VideoFormValues,
  type VideoInput,
} from '@/entity/video/model/video.model';
import { todayInTbilisi } from '@/shared/lib/calendar-date';
import { startFresh } from '@/shared/components/fresh-form';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useSlugAutofill } from '@/shared/lib/use-slug-autofill';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';
import type { UploadedVideo } from '@/widgets/video-upload/video-upload.service';

/** Where a video plays from: a YouTube link or a file uploaded here. */
export type VideoSource = 'YOUTUBE' | 'FILE';

const EMPTY_TRANSLATION = { title: '', summary: '' };

/** A new video starts on today's date, the usual case: it has just come out. */
function emptyVideo(): VideoFormValues {
  return {
    slug: '',
    youtubeUrl: '',
    fileUrl: null,
    posterMediaId: null,
    kind: '',
    publishedAt: todayInTbilisi(),
    durationMinutes: null,
    status: 'DRAFT',
    translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
  };
}

function toFormValues(video: AdminVideo): VideoFormValues {
  return {
    slug: video.slug,
    youtubeUrl: video.youtubeUrl ?? '',
    fileUrl: video.file?.url ?? null,
    posterMediaId: video.posterMediaId,
    kind: video.kind ?? '',
    publishedAt: video.publishedAt,
    durationMinutes: video.durationMinutes,
    status: video.status,
    translations: {
      KA: { ...video.translations.KA },
      EN: { ...video.translations.EN },
    },
  };
}

export function useAdminVideoForm({ videoId }: { videoId?: string }) {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const router = useRouter();
  const isEdit = Boolean(videoId);

  const videoQuery = useQuery({ ...adminVideoQuery(videoId ?? ''), enabled: isEdit });
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<VideoFormValues, unknown, VideoInput>({
    resolver: zodResolver(videoInputSchema, { error: validationErrorMap }),
    defaultValues: emptyVideo(),
  });

  // While creating, the slug follows the English title until it is edited
  // by hand (use-slug-autofill.ts). Validated as it changes only after a save
  // was tried, so an empty title does not flag the slug mid-typing.
  const setSlug = useCallback(
    (slug: string) =>
      form.setValue('slug', slug, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    [form],
  );
  const slugAutofill = useSlugAutofill({ enabled: !isEdit, setSlug });

  const { reset } = form;

  // The switch, and the file shown under it. The file is kept while the
  // switch is on YouTube, so switching back does not lose an upload; only
  // the chosen source is ever in the form, so a save sends one or the other.
  const [source, setSourceState] = useState<VideoSource>('YOUTUBE');
  const [file, setFileState] = useState<UploadedVideo | null>(null);

  useEffect(() => {
    if (videoQuery.data) reset(toFormValues(videoQuery.data));
  }, [videoQuery.data, reset]);

  // Taken from each loaded record while rendering, the way React derives
  // state from a changed value (no effect: a second render pass for nothing).
  const [loaded, setLoaded] = useState<AdminVideo | undefined>(undefined);
  if (videoQuery.data !== loaded) {
    setLoaded(videoQuery.data);
    if (videoQuery.data) {
      setFileState(videoQuery.data.file);
      setSourceState(videoQuery.data.file ? 'FILE' : 'YOUTUBE');
    }
  }

  const setFile = (next: UploadedVideo | null) => {
    setFileState(next);
    form.setValue('fileUrl', next?.url ?? null, { shouldDirty: true });
  };

  const setSource = (next: VideoSource) => {
    setSourceState(next);
    if (next === 'FILE') {
      form.setValue('youtubeUrl', '', { shouldDirty: true });
      form.setValue('fileUrl', file?.url ?? null, { shouldDirty: true });
    } else {
      form.setValue('fileUrl', null, { shouldDirty: true });
    }
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      setSubmitError(null);
      try {
        if (videoId) {
          await updateVideo.mutateAsync({ id: videoId, input: values });
        } else {
          await createVideo.mutateAsync(values);
          startFresh('video');
        }
        router.push('/admin/videos');
      } catch (caught) {
        setSubmitError(formErrors.message(caught));
        for (const [field, message] of Object.entries(formErrors.fields(caught))) {
          form.setError(field as keyof VideoFormValues, { type: 'server', message });
        }
      }
    },
    // The form's own checks stopped the save. A field may have no message in
    // view (a dropdown, a field on the other language's tab), so say it here
    // rather than leave Save looking dead.
    () => setSubmitError(formErrors.invalid()),
  );

  return {
    form,
    onSubmit,
    isEdit,
    slugAutofill,
    isLoading: isEdit && videoQuery.isLoading,
    // A record that failed to load gets no form (LoadFailed), but only while
    // nothing has loaded: a failed background refresh must not
    // take away a form someone is typing in.
    loadError: videoQuery.error && !videoQuery.data ? formErrors.message(videoQuery.error) : null,
    retry: () => void videoQuery.refetch(),
    isSubmitting: createVideo.isPending || updateVideo.isPending,
    submitError,
    source,
    setSource,
    file,
    setFile,
  };
}
