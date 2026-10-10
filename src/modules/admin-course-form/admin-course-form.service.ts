'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { adminCourseCategoriesQuery } from '@/entity/course-category/api/course-category.query';
import {
  adminCourseQuery,
  useCreateCourse,
  useUpdateCourse,
} from '@/entity/course/api/course.query';
import {
  courseInputSchema,
  type AdminCourse,
  type CourseFormValues,
  type CourseInput,
} from '@/entity/course/model/course.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useSlugAutofill } from '@/shared/lib/use-slug-autofill';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';

const EMPTY_TRANSLATION = { title: '', summary: '', duration: '', location: '' };

// Dropdowns and the date input hold "" for none; the schema reads it as null.
const EMPTY_COURSE: CourseFormValues = {
  slug: '',
  categoryId: '',
  serviceId: '',
  coverMediaId: null,
  format: 'IN_PERSON',
  startsAt: '',
  seatsTotal: null,
  seatsLeft: null,
  priceGel: null,
  status: 'DRAFT',
  order: 0,
  translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
};

function toFormValues(course: AdminCourse): CourseFormValues {
  return {
    slug: course.slug,
    categoryId: course.categoryId ?? '',
    serviceId: course.serviceId ?? '',
    coverMediaId: course.coverMediaId,
    format: course.format,
    startsAt: course.startsAt ?? '',
    seatsTotal: course.seatsTotal,
    seatsLeft: course.seatsLeft,
    priceGel: course.priceGel,
    status: course.status,
    order: course.order,
    translations: {
      KA: { ...course.translations.KA },
      EN: { ...course.translations.EN },
    },
  };
}

export function useAdminCourseForm({ courseId }: { courseId?: string }) {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const router = useRouter();
  const isEdit = Boolean(courseId);

  const courseQuery = useQuery({ ...adminCourseQuery(courseId ?? ''), enabled: isEdit });
  const categoriesQuery = useQuery(adminCourseCategoriesQuery());

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CourseFormValues, unknown, CourseInput>({
    resolver: zodResolver(courseInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY_COURSE,
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

  useEffect(() => {
    if (courseQuery.data) reset(toFormValues(courseQuery.data));
  }, [courseQuery.data, reset]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      setSubmitError(null);
      try {
        if (courseId) {
          await updateCourse.mutateAsync({ id: courseId, input: values });
        } else {
          await createCourse.mutateAsync(values);
        }
        router.push('/admin/courses');
        router.refresh();
      } catch (caught) {
        setSubmitError(formErrors.message(caught));
        for (const [field, message] of Object.entries(formErrors.fields(caught))) {
          form.setError(field as keyof CourseFormValues, { type: 'server', message });
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
    isLoading: isEdit && courseQuery.isLoading,
    // A record that failed to load gets no form (LoadFailed), but only while
    // nothing has loaded: a failed background refresh must not
    // take away a form someone is typing in.
    loadError:
      courseQuery.error && !courseQuery.data ? formErrors.message(courseQuery.error) : null,
    retry: () => void courseQuery.refetch(),
    isSubmitting: createCourse.isPending || updateCourse.isPending,
    submitError,
    categoryOptions: (categoriesQuery.data?.items ?? []).map((category) => ({
      value: category.id,
      label: category.translations.KA.name || category.translations.EN.name || category.slug,
    })),
  };
}
