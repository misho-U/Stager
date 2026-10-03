'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { adminProjectsQuery, useDeleteProject } from '@/entity/project/api/project.query';
import { useFormErrors } from '@/shared/lib/form-errors';

export function useAdminProjects() {
  const { data, isLoading, error, refetch } = useQuery(adminProjectsQuery());
  const deleteProject = useDeleteProject();
  const formErrors = useFormErrors();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteProject.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  return {
    projects: data?.items ?? [],
    isLoading,
    // Only while nothing has loaded; a failed refresh keeps what is on screen.
    loadError: error && !data ? formErrors.message(error) : null,
    retry: () => void refetch(),
    remove,
    isDeleting: deleteProject.isPending,
    deletingId: deleteProject.variables ?? null,
    deleteError,
  };
}
