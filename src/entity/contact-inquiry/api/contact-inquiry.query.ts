import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteInquiry,
  fetchInquiries,
  fetchUnreadInquiries,
  submitContactInquiry,
  updateInquiryStatus,
} from '@/entity/contact-inquiry/api/contact-inquiry.api';
import type {
  ContactSubmission,
  InquiryStatusUpdate,
  InquiryView,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  list: (view: InquiryView) => ['inquiries', 'list', view] as const,
  unread: () => ['inquiries', 'unread'] as const,
};

export const inquiriesQuery = (view: InquiryView) =>
  queryOptions({ queryKey: inquiryKeys.list(view), queryFn: () => fetchInquiries(view) });

/**
 * The sidebar's count of new inquiries. Checked again every minute and when
 * the window regains focus: with email notifications off, this badge is how
 * a new lead gets noticed.
 */
export const unreadInquiriesQuery = () =>
  queryOptions({
    queryKey: inquiryKeys.unread(),
    queryFn: fetchUnreadInquiries,
    refetchInterval: 60_000,
    // One count, so unlike the lists it is worth asking again on return.
    refetchOnWindowFocus: true,
  });

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
