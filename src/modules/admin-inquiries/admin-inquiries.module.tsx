'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
import { LOCALE_NAMES } from '@/shared/constants/content';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';

export function AdminInquiriesModule() {
  const t = useTranslations('admin');
  // The contact form's own wording for each interest, in the dashboard's language.
  const tInterest = useTranslations('contact.interests');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const { data, isLoading, error } = useQuery(inquiriesQuery());
  const updateStatus = useUpdateInquiryStatus();
  const deleteInquiry = useDeleteInquiry();
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = async (inquiry: AdminContactInquiry, status: 'NEW' | 'READ' | 'ARCHIVED') => {
    setActionError(null);
    try {
      await updateStatus.mutateAsync({ id: inquiry.id, input: { status } });
    } catch (caught) {
      setActionError(formErrors.message(caught));
    }
  };

  const remove = async (id: string) => {
    setActionError(null);
    try {
      await deleteInquiry.mutateAsync(id);
    } catch (caught) {
      setActionError(formErrors.message(caught));
    }
  };

  const inquiries = data?.items ?? [];

  return (
    <>
      <PageHeader title={t('inquiries.title')} description={t('inquiries.description')} />

      {error ? <ErrorNotice message={formErrors.message(error)} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      {isLoading ? (
        <Panel>
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        </Panel>
      ) : inquiries.length === 0 ? (
        <Panel>
          <EmptyState
            title={t('inquiries.emptyTitle')}
            description={t('inquiries.emptyDescription')}
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {inquiries.map((inquiry) => (
            <Panel
              key={inquiry.id}
              title={inquiry.name}
              description={`${tInterest(inquiry.interest)} · ${format.dateTime(inquiry.createdAt)}`}
              actions={<StatusBadge status={inquiry.status} />}
            >
              <div className="flex flex-col gap-3">
                <dl className="grid gap-x-6 gap-y-1 text-body-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-subtle">{t('inquiries.email')}</dt>
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
                      <dt className="shrink-0 text-ink-subtle">{t('inquiries.phone')}</dt>
                      <dd className="text-ink">{inquiry.phone}</dd>
                    </div>
                  ) : null}
                  {inquiry.company ? (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-ink-subtle">{t('inquiries.company')}</dt>
                      <dd className="text-ink">{inquiry.company}</dd>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-subtle">{t('inquiries.language')}</dt>
                    <dd className="text-ink">{LOCALE_NAMES[inquiry.locale]}</dd>
                  </div>
                </dl>

                <p className="rounded-md bg-surface-inset p-3 text-body-sm whitespace-pre-wrap">
                  {inquiry.message}
                </p>

                {!inquiry.notifiedAt ? (
                  <p className="text-caption text-warning">{t('inquiries.notNotified')}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  {inquiry.status !== 'READ' ? (
                    <Button variant="secondary" size="sm" onClick={() => void setStatus(inquiry, 'READ')}>
                      {t('inquiries.markRead')}
                    </Button>
                  ) : null}
                  {inquiry.status !== 'ARCHIVED' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void setStatus(inquiry, 'ARCHIVED')}
                    >
                      {t('inquiries.archive')}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => void setStatus(inquiry, 'NEW')}>
                      {t('inquiries.restore')}
                    </Button>
                  )}
                  <ConfirmButton
                    label={t('common.delete')}
                    confirmLabel={t('common.confirm')}
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
