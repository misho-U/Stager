'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  inquiriesQuery,
  useDeleteInquiry,
  useUpdateInquiryStatus,
} from '@/entity/contact-inquiry/api/contact-inquiry.query';
import type { AdminContactInquiry } from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState, ErrorNotice, Panel, StatusBadge } from '@/shared/components/panel';
import { INQUIRY_INTEREST_OPTIONS } from '@/shared/constants/content';
import { toFormErrorMessage } from '@/shared/lib/form-errors';

const INTEREST_LABELS = new Map(
  INQUIRY_INTEREST_OPTIONS.map((option) => [option.value, option.label]),
);

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminInquiriesModule() {
  const { data, isLoading, error } = useQuery(inquiriesQuery());
  const updateStatus = useUpdateInquiryStatus();
  const deleteInquiry = useDeleteInquiry();
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = async (inquiry: AdminContactInquiry, status: 'NEW' | 'READ' | 'ARCHIVED') => {
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ id: inquiry.id, input: { status } });
    } catch (caught) {
      setActionError(toFormErrorMessage(caught));
    }
  };

  const remove = async (id: string) => {
    setActionError(null);
    try {
      await deleteInquiry.mutateAsync(id);
    } catch (caught) {
      setActionError(toFormErrorMessage(caught));
    }
  };

  const inquiries = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Messages from the contact form. These are also emailed to the inquiry inbox."
      />

      {error ? <ErrorNotice message={toFormErrorMessage(error)} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      {isLoading ? (
        <Panel>
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        </Panel>
      ) : inquiries.length === 0 ? (
        <Panel>
          <EmptyState
            title="No inquiries yet"
            description="Submissions from the Start a Project form will appear here."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {inquiries.map((inquiry) => (
            <Panel
              key={inquiry.id}
              title={inquiry.name}
              description={`${INTEREST_LABELS.get(inquiry.interest) ?? inquiry.interest} · ${formatDateTime(inquiry.createdAt)}`}
              actions={<StatusBadge status={inquiry.status} />}
            >
              <div className="flex flex-col gap-3">
                <dl className="grid gap-x-6 gap-y-1 text-body-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="text-ink underline underline-offset-4"
                      >
                        {inquiry.email}
                      </a>
                    </dd>
                  </div>
                  {inquiry.phone ? (
                    <div className="flex gap-2">
                      <dt className="text-ink-subtle">Phone</dt>
                      <dd className="text-ink">{inquiry.phone}</dd>
                    </div>
                  ) : null}
                  {inquiry.company ? (
                    <div className="flex gap-2">
                      <dt className="text-ink-subtle">Company</dt>
                      <dd className="text-ink">{inquiry.company}</dd>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle">Language</dt>
                    <dd className="text-ink">{inquiry.locale}</dd>
                  </div>
                </dl>

                <p className="rounded-md bg-brand-cream-light p-3 text-body-sm whitespace-pre-wrap">
                  {inquiry.message}
                </p>

                {!inquiry.notifiedAt ? (
                  <p className="text-caption text-warning">
                    The notification email could not be sent for this one — reply directly.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  {inquiry.status !== 'READ' ? (
                    <Button variant="secondary" size="sm" onClick={() => void setStatus(inquiry, 'READ')}>
                      Mark read
                    </Button>
                  ) : null}
                  {inquiry.status !== 'ARCHIVED' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void setStatus(inquiry, 'ARCHIVED')}
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => void setStatus(inquiry, 'NEW')}>
                      Restore
                    </Button>
                  )}
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Confirm"
                    loading={deleteInquiry.isPending && deleteInquiry.variables === inquiry.id}
                    onConfirm={() => remove(inquiry.id)}
                  />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
