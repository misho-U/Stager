'use client';

import { useTranslations } from 'next-intl';

import { useErrorReportingCheck } from '@/modules/admin-settings/elements/error-reporting/error-reporting.service';
import { Button } from '@/shared/components/button';
import { ErrorNotice, Panel, SuccessNotice } from '@/shared/components/panel';

/** Lets the owner check that errors reach Sentry (owner only: the API says so). */
export function ErrorReporting() {
  const t = useTranslations('admin.settings.errorReporting');
  const { send, isSending, result, error } = useErrorReportingCheck();

  return (
    <Panel title={t('title')} description={t('description')}>
      <div className="flex flex-col items-start gap-3">
        {error ? <ErrorNotice message={error} /> : null}
        {result === 'sent' ? <SuccessNotice message={t('sent')} /> : null}
        {result === 'off' ? <ErrorNotice message={t('off')} /> : null}
        <Button type="button" variant="secondary" loading={isSending} onClick={() => void send()}>
          {t('send')}
        </Button>
      </div>
    </Panel>
  );
}
