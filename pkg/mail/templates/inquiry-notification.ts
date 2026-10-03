import { createTranslator } from 'next-intl';

import { BRAND_HEX } from '@pkg/brand/hex.generated';
import adminKa from '@pkg/i18n/messages/admin.ka.json';
import siteKa from '@pkg/i18n/messages/ka.json';

/**
 * Contact-form notification, sent to the STAGER inbox.
 *
 * Plain template strings rather than a React email renderer: this is one
 * internal notification, and every value below is escaped by hand so a
 * submitted name containing markup cannot inject anything into the recipient's
 * mail client.
 *
 * Mail clients cannot read the site's stylesheet, so the colours come from
 * BRAND_HEX — hex copies generated from src/shared/brandbook/brandbook.css.
 * A brand colour changed there reaches this email too.
 *
 * Written in Georgian, whatever language the visitor used: the inbox has one
 * reader, and there is no per-recipient language to choose from. The wording
 * lives with the dashboard's, under `email` in admin.ka.json, so it is reviewed
 * and checked with the rest; the interests are the contact form's own labels.
 */

const { teal: INK, sage: MUTED, cream: PAGE, white: CARD } = BRAND_HEX;

const EMAIL_LOCALE = 'ka';
const TIME_ZONE = 'Asia/Tbilisi';

const t = createTranslator({
  locale: EMAIL_LOCALE,
  messages: { email: adminKa.email },
  namespace: 'email',
});

const INTEREST_LABELS: Record<string, string> = siteKa.contact.interests;

const RECEIVED_AT = new Intl.DateTimeFormat(EMAIL_LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

type InquiryEmailInput = {
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  /** The contact form's interest code, e.g. MENU_DEVELOPMENT. */
  interest: string;
  message: string;
  /** The language of the site the visitor wrote from: KA or EN. */
  locale: string;
  submittedAt: Date;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function row(label: string, value: string | null): string {
  if (!value) return '';
  return `<tr>
      <td style="padding:6px 16px 6px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:${INK};font-size:14px;">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildInquiryNotification(input: InquiryEmailInput) {
  const subject = input.company
    ? t('subjectWithCompany', { name: input.name, company: input.company })
    : t('subject', { name: input.name });

  const interest = INTEREST_LABELS[input.interest] ?? input.interest;
  const language = input.locale.toUpperCase() === 'EN' ? t('languages.en') : t('languages.ka');
  const receivedAt = RECEIVED_AT.format(input.submittedAt);

  const html = `<!doctype html>
<html lang="${EMAIL_LOCALE}">
  <body style="margin:0;padding:24px;background:${PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:${CARD};border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;color:${MUTED};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">STAGER</p>
      <h1 style="margin:0 0 20px;color:${INK};font-size:20px;font-weight:600;">${escapeHtml(t('heading'))}</h1>
      <table style="width:100%;border-collapse:collapse;">
        ${row(t('name'), input.name)}
        ${row(t('company'), input.company)}
        ${row(t('email'), input.email)}
        ${row(t('phone'), input.phone)}
        ${row(t('interest'), interest)}
        ${row(t('language'), language)}
        ${row(t('received'), receivedAt)}
      </table>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid ${PAGE};">
        <p style="margin:0 0 8px;color:${MUTED};font-size:13px;">${escapeHtml(t('message'))}</p>
        <p style="margin:0;color:${INK};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
      </div>
      <p style="margin:24px 0 0;color:${MUTED};font-size:12px;">
        ${escapeHtml(t('replyHint'))}
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `${t('heading')} — STAGER`,
    '',
    `${t('name')}: ${input.name}`,
    input.company ? `${t('company')}: ${input.company}` : null,
    `${t('email')}: ${input.email}`,
    input.phone ? `${t('phone')}: ${input.phone}` : null,
    `${t('interest')}: ${interest}`,
    `${t('language')}: ${language}`,
    `${t('received')}: ${receivedAt}`,
    '',
    `${t('message')}:`,
    input.message,
    '',
    t('replyHint'),
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text };
}
