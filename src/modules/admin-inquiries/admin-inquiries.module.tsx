'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import {
  inquiriesQuery,
  useDeleteInquiry,
  useUpdateInquiryStatus,
} from '@/entity/contact-inquiry/api/contact-inquiry.query';
import {
  INQUIRY_VIEWS,
  type AdminContactInquiry,
  type InquiryView,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState, ErrorNotice, LoadFailed, Panel, StatusBadge } from '@/shared/components/panel';
import { LOCALE_NAMES } from '@/shared/constants/content';
import { cn } from '@/shared/lib/cn';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';

export function AdminInquiriesModule() {
  const t = useTranslations('admin');
  // The contact form's own wording for each interest, in the dashboard's language.
  const tInterest = useTranslations('contact.interests');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const viewLabelId = useId();
  // The inbox holds what still needs handling; Archive moves an inquiry out of it.
  const [view, setView] = useState<InquiryView>('inbox');
  const { data, isLoading, isPlaceholderData, error, refetch } = useQuery({
    ...inquiriesQuery(view),
    // The other view's list stays on screen, with its counts, until this one arrives.
    placeholderData: keepPreviousData,
  });
  // Only while nothing has loaded; a failed refresh keeps the list on screen.
  const loadFailed = error && !data ? formErrors.message(error) : null;
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
  const counts = data?.counts;

  return (
    <>
      <PageHeader title={t('inquiries.title')} description={t('inquiries.description')} />

      <div className="flex flex-wrap items-center gap-3">
        <span id={viewLabelId} className="sr-only">
          {t('inquiries.views.label')}
        </span>
        <div
          role="group"
          aria-labelledby={viewLabelId}
          className="border-line bg-surface-raised flex rounded-md border p-0.5"
        >
          {INQUIRY_VIEWS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === view}
              onClick={() => setView(option)}
              className={cn(
                'text-body-sm flex items-center gap-2 rounded-sm px-3 py-1 font-medium transition-colors',
                option === view ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t(`inquiries.views.${option}`)}
              {counts ? <span className="tabular-nums">{counts[option]}</span> : null}
            </button>
          ))}
        </div>
        {counts && counts.unread > 0 ? (
          <p className="text-body-sm text-ink-muted">
            {t('inquiries.unread', { count: counts.unread })}
          </p>
        ) : null}
      </div>

      {data && !data.emailOn ? (
        // On a card: the warning colour is too faint for text on the page itself.
        <p
          role="note"
          className="border-line bg-surface-raised text-body-sm text-warning rounded-md border px-4 py-3"
        >
          {t('inquiries.emailOff')}
        </p>
      ) : null}

      {actionError ? <ErrorNotice message={actionError} /> : null}

      {loadFailed ? (
        <LoadFailed message={loadFailed} onRetry={() => void refetch()} />
      ) : isLoading || (isPlaceholderData && inquiries.length === 0) ? (
        <Panel>
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        </Panel>
      ) : inquiries.length === 0 ? (
        <Panel>
          <EmptyState
            title={t(view === 'archived' ? 'inquiries.archivedEmptyTitle' : 'inquiries.emptyTitle')}
            description={t(
              view === 'archived'
                ? 'inquiries.archivedEmptyDescription'
                : 'inquiries.emptyDescription',
            )}
          />
        </Panel>
      ) : (
        <div
          className={cn('flex flex-col gap-4', isPlaceholderData && 'opacity-60')}
          aria-busy={isPlaceholderData || undefined}
        >
          {data && data.total > inquiries.length ? (
            <p className="text-body-sm text-ink-muted">
              {t('inquiries.showingNewest', { shown: inquiries.length, total: data.total })}
            </p>
          ) : null}
          {inquiries.map((inquiry) => (
            <Panel
              key={inquiry.id}
              title={inquiry.name}
              description={`${tInterest(inquiry.interest)} · ${format.dateTime(inquiry.createdAt)}`}
              actions={<StatusBadge status={inquiry.status} />}
            >
              <div className="flex flex-col gap-3">
                <dl className="text-body-sm grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle shrink-0">{t('inquiries.email')}</dt>
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
                      <dt className="text-ink-subtle shrink-0">{t('inquiries.phone')}</dt>
                      <dd className="text-ink">{inquiry.phone}</dd>
                    </div>
                  ) : null}
                  {inquiry.company ? (
                    <div className="flex gap-2">
                      <dt className="text-ink-subtle shrink-0">{t('inquiries.company')}</dt>
                      <dd className="text-ink">{inquiry.company}</dd>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <dt className="text-ink-subtle shrink-0">{t('inquiries.language')}</dt>
                    <dd className="text-ink">{LOCALE_NAMES[inquiry.locale]}</dd>
                  </div>
                </dl>

                <p className="bg-surface-inset text-body-sm rounded-md p-3 whitespace-pre-wrap">
                  {inquiry.message}
                </p>

                {data?.emailOn && !inquiry.notifiedAt ? (
                  <p className="text-caption text-warning">{t('inquiries.notNotified')}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  {inquiry.status !== 'READ' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void setStatus(inquiry, 'READ')}
                    >
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void setStatus(inquiry, 'NEW')}
                    >
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
