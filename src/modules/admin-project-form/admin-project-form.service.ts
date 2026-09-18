'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminProjectQuery,
  useCreateProject,
  useUpdateProject,
} from '@/entity/project/api/project.query';
import {
  projectInputSchema,
  type ProjectFormValues,
  type ProjectInput,
} from '@/entity/project/model/project.model';
import { adminServicesQuery } from '@/entity/service/api/service.query';
import {
  EMPTY_PROJECT,
  toFormValues,
} from '@/modules/admin-project-form/admin-project-form.constants';
import { toFieldErrors, toFormErrorMessage } from '@/shared/lib/form-errors';

type UseProjectFormOptions = { projectId?: string };

export function useAdminProjectForm({ projectId }: UseProjectFormOptions) {
  const router = useRouter();
  const isEdit = Boolean(projectId);

  const projectQuery = useQuery({
    ...adminProjectQuery(projectId ?? ''),
    enabled: isEdit,
  });

  // Services power the multi-select; drafts are included so a project can be
  // linked to a service that is not published yet.
  const servicesQuery = useQuery(adminServicesQuery());

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Three generics: the values the form holds, the resolver context, and the
  // validated values handleSubmit receives. They differ because the schema
  // applies defaults, so `status` is optional in the form and guaranteed after.
  const form = useForm<ProjectFormValues, unknown, ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: EMPTY_PROJECT,
  });

  const { reset } = form;

  // Populate once the record arrives. Keyed on the fetched object so a refetch
  // after a save does not clobber edits the user has since typed.
  useEffect(() => {
    if (projectQuery.data) reset(toFormValues(projectQuery.data));
  }, [projectQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      if (projectId) {
        await updateProject.mutateAsync({ id: projectId, input: values });
      } else {
        await createProject.mutateAsync(values);
      }

      router.push('/admin/projects');
      router.refresh();
    } catch (caught) {
      setSubmitError(toFormErrorMessage(caught));

      // Re-attach server-side field errors (e.g. a duplicate slug) to the
      // inputs they belong to, so the message appears where the fix is.
      for (const [field, message] of Object.entries(toFieldErrors(caught))) {
        form.setError(field as keyof ProjectFormValues, { type: 'server', message });
      }
    }
  });

  return {
    form,
    onSubmit,
    isEdit,
    isLoading: isEdit && projectQuery.isLoading,
    loadError: projectQuery.error ? toFormErrorMessage(projectQuery.error) : null,
    isSubmitting: createProject.isPending || updateProject.isPending,
    submitError,
    services: servicesQuery.data?.items ?? [],
  };
}
