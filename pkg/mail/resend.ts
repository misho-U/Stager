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

/** Long enough for a slow day at the provider, short enough to give up cleanly. */
const SEND_TIMEOUT_MS = 10_000;

type SendEmailInput = {
  to: string | string[];
  /**
   * What the email is for, e.g. `inquiry:<id>`, for the log. The subject is
   * never logged: an inquiry's carries the visitor's name and company.
   */
  purpose: string;
  /** Resend sends one email per key, however often it is asked: safe retries. */
  idempotencyKey?: string;
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
      purpose: input.purpose,
      detail: 'RESEND_API_KEY/MAIL_FROM are unset — the inquiry is stored but no email was sent.',
    });
    return { ok: false, error: 'Email is not configured' };
  }

  // The SDK sets no time limit of its own; a hung request would hold the
  // function until the platform killed it.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Mail send timed out')), SEND_TIMEOUT_MS);
  });

  try {
    const { data, error } = await Promise.race([
      getResend(apiKey).emails.send(
        {
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      ),
      timedOut,
    ]);

    if (error) {
      logger.error('mail.send_rejected', { purpose: input.purpose, reason: error.message });
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    logger.error('mail.send_failed', { purpose: input.purpose, ...serialiseError(error) });
    return { ok: false, error: 'Mail transport failed' };
  } finally {
    clearTimeout(timer);
  }
}
