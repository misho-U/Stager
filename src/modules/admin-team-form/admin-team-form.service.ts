'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  adminTeamMemberQuery,
  useCreateTeamMember,
  useUpdateTeamMember,
} from '@/entity/team-member/api/team-member.query';
import {
  teamMemberInputSchema,
  type AdminTeamMember,
  type TeamMemberFormValues,
  type TeamMemberInput,
} from '@/entity/team-member/model/team-member.model';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useSlugAutofill } from '@/shared/lib/use-slug-autofill';
import { useValidationErrorMap } from '@/shared/lib/use-validation-error-map';

const EMPTY_TRANSLATION = { name: '', position: '', bio: '', expertise: '' };

const EMPTY_MEMBER: TeamMemberFormValues = {
  slug: '',
  photoMediaId: null,
  email: '',
  linkedinUrl: '',
  status: 'DRAFT',
  order: 0,
  translations: { KA: { ...EMPTY_TRANSLATION }, EN: { ...EMPTY_TRANSLATION } },
};

function toFormValues(member: AdminTeamMember): TeamMemberFormValues {
  return {
    slug: member.slug,
    photoMediaId: member.photoMediaId,
    email: member.email ?? '',
    linkedinUrl: member.linkedinUrl ?? '',
    status: member.status,
    order: member.order,
    translations: { KA: { ...member.translations.KA }, EN: { ...member.translations.EN } },
  };
}

export function useAdminTeamForm({ memberId }: { memberId?: string }) {
  const formErrors = useFormErrors();
  const validationErrorMap = useValidationErrorMap();
  const router = useRouter();
  const isEdit = Boolean(memberId);

  const memberQuery = useQuery({ ...adminTeamMemberQuery(memberId ?? ''), enabled: isEdit });
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<TeamMemberFormValues, unknown, TeamMemberInput>({
    resolver: zodResolver(teamMemberInputSchema, { error: validationErrorMap }),
    defaultValues: EMPTY_MEMBER,
  });

  // While creating, the slug follows the English name until it is edited
  // by hand (use-slug-autofill.ts). Validated as it changes only after a save
  // was tried, so an empty name does not flag the slug mid-typing.
  const setSlug = useCallback(
    (slug: string) =>
      form.setValue('slug', slug, { shouldDirty: true, shouldValidate: form.formState.isSubmitted }),
    [form],
  );
  const slugAutofill = useSlugAutofill({ enabled: !isEdit, setSlug });

  const { reset } = form;

  useEffect(() => {
    if (memberQuery.data) reset(toFormValues(memberQuery.data));
  }, [memberQuery.data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (memberId) {
        await updateMember.mutateAsync({ id: memberId, input: values });
      } else {
        await createMember.mutateAsync(values);
      }
      router.push('/admin/team');
      router.refresh();
    } catch (caught) {
      setSubmitError(formErrors.message(caught));
      for (const [field, message] of Object.entries(formErrors.fields(caught))) {
        form.setError(field as keyof TeamMemberFormValues, { type: 'server', message });
      }
    }
  });

  return {
    form,
    onSubmit,
    isEdit,
    slugAutofill,
    isLoading: isEdit && memberQuery.isLoading,
    isSubmitting: createMember.isPending || updateMember.isPending,
    submitError,
  };
}
