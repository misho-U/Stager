import 'server-only';

import { Resend } from 'resend';

import { serverEnv } from '@pkg/config/env.server';
import { logger, serialiseError } from '@pkg/logger';

let client: Resend | null = null;

function getResend(): Resend {
  client ??= new Resend(serverEnv.RESEND_API_KEY);
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
  try {
    const { data, error } = await getResend().emails.send({
      from: serverEnv.MAIL_FROM,
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
