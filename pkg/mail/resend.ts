import 'server-only';

import { Resend } from 'resend';

import { serverEnv } from '@pkg/config/env.server';
import { logger, serialiseError } from '@pkg/logger';

let client: Resend | null = null;

/** Both are optional, so email is simply off until they are set. */
export const isEmailConfigured = Boolean(serverEnv.RESEND_API_KEY && serverEnv.MAIL_FROM);

function getResend(apiKey: string): Resend {
  client ??= new Resend(apiKey);
  return client;
}

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

/**
 * Send one transactional email.
 *
 * Returns a result instead of throwing so callers can decide what a failure
 * means. For the contact form it means: keep the inquiry in the database with
 * notifiedAt unset, and still tell the visitor their message was received —
 * because it was. Losing the submission because an email vendor had a bad
 * minute would be the worse outcome.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { RESEND_API_KEY: apiKey, MAIL_FROM: from } = serverEnv;

  // Not an error: the site is deployable before Resend's DNS verification
  // completes, and a contact form that records submissions without emailing
  // them is still a working contact form. Logged at warn so it is visible in
  // the deployment log rather than silently forgotten.
  if (!apiKey || !from) {
    logger.warn('mail.not_configured', {
      subject: input.subject,
      detail: 'RESEND_API_KEY/MAIL_FROM are unset — the inquiry is stored but no email was sent.',
    });
    return { ok: false, error: 'Email is not configured' };
  }

  try {
    const { data, error } = await getResend(apiKey).emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      logger.error('mail.send_rejected', { subject: input.subject, reason: error.message });
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    logger.error('mail.send_failed', { subject: input.subject, ...serialiseError(error) });
    return { ok: false, error: 'Mail transport failed' };
  }
}
