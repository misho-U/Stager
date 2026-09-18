import {
  adminContactInquiryListResponseSchema,
  adminContactInquirySchema,
  contactSubmissionResponseSchema,
  type AdminContactInquiry,
  type ContactSubmission,
  type InquiryStatusUpdate,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';
import type { ListResponse } from '@/shared/types/api';
import { clientFetch } from '@pkg/http/fetcher';

/** Public endpoint — no session required. */
export async function submitContactInquiry(input: ContactSubmission) {
  const raw = await clientFetch<unknown>('/api/contact', { method: 'POST', body: input });
  return contactSubmissionResponseSchema.parse(raw);
}

const ADMIN_BASE = '/api/admin/inquiries';

export async function fetchInquiries(): Promise<ListResponse<AdminContactInquiry>> {
  const raw = await clientFetch<unknown>(ADMIN_BASE);
  return adminContactInquiryListResponseSchema.parse(raw);
}

export async function updateInquiryStatus(
  id: string,
  input: InquiryStatusUpdate,
): Promise<AdminContactInquiry> {
  const raw = await clientFetch<unknown>(`${ADMIN_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
  return adminContactInquirySchema.parse(raw);
}

export async function deleteInquiry(id: string): Promise<void> {
  await clientFetch<void>(`${ADMIN_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
