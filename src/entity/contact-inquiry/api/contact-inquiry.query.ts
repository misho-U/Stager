import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteInquiry,
  fetchInquiries,
  submitContactInquiry,
  updateInquiryStatus,
} from '@/entity/contact-inquiry/api/contact-inquiry.api';
import type {
  ContactSubmission,
  InquiryStatusUpdate,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  lists: () => ['inquiries', 'list'] as const,
};

export const inquiriesQuery = () =>
  queryOptions({ queryKey: inquiryKeys.lists(), queryFn: fetchInquiries });

/** Used by the public contact form. */
export function useSubmitContactInquiry() {
  return useMutation({
    mutationFn: (input: ContactSubmission) => submitContactInquiry(input),
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InquiryStatusUpdate }) =>
      updateInquiryStatus(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inquiryKeys.all }),
  });
}

export function useDeleteInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInquiry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inquiryKeys.all }),
  });
}
