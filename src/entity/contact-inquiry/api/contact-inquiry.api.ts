import {
  adminContactInquiryListResponseSchema,
  adminContactInquirySchema,
  contactSubmissionResponseSchema,
  unreadInquiriesSchema,
  type AdminContactInquiry,
  type AdminContactInquiryList,
  type ContactSubmission,
  type InquiryStatusUpdate,
  type InquiryView,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { clientFetch } from '@pkg/http/fetcher';

/** Public endpoint — no session required. */
export async function submitContactInquiry(input: ContactSubmission) {
  const raw = await clientFetch<unknown>('/api/contact', { method: 'POST', body: input });
  return contactSubmissionResponseSchema.parse(raw);
}

const ADMIN_BASE = '/api/admin/inquiries';

export async function fetchInquiries(view: InquiryView): Promise<AdminContactInquiryList> {
  const raw = await clientFetch<unknown>(`${ADMIN_BASE}?view=${view}`);
  return adminContactInquiryListResponseSchema.parse(raw);
}

export async function fetchUnreadInquiries(): Promise<number> {
  const raw = await clientFetch<unknown>(`${ADMIN_BASE}/unread`);
  return unreadInquiriesSchema.parse(raw).count;
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
