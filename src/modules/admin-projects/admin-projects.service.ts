'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { adminProjectsQuery, useDeleteProject } from '@/entity/project/api/project.query';
import { useFormErrors } from '@/shared/lib/form-errors';

export function useAdminProjects() {
  const { data, isLoading, error } = useQuery(adminProjectsQuery());
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
    loadError: error ? formErrors.message(error) : null,
    remove,
    isDeleting: deleteProject.isPending,
    deletingId: deleteProject.variables ?? null,
    deleteError,
  };
}
