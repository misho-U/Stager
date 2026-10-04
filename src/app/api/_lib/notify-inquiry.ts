import 'server-only';

import { getInquiryInbox } from '@/app/api/_lib/repositories/site-setting.repository';
import { serverEnv } from '@pkg/config/env.server';
import { prisma } from '@pkg/db/prisma';
import { logger, serialiseError } from '@pkg/logger';
import { isEmailConfigured, sendEmail } from '@pkg/mail/resend';
import { buildInquiryNotification } from '@pkg/mail/templates/inquiry-notification';

/**
 * Email the inbox about one stored inquiry, once.
 *
 * Runs after the visitor has their answer (the contact route hands it to
 * `after()`), and again from the daily retry for any inquiry still not
 * notified. Safe to repeat: an inquiry already notified is skipped, and the
 * email carries the inquiry id as its idempotency key, so Resend never sends a
 * retry twice. Never throws; a failure leaves `notifiedAt` unset, which the
 * dashboard shows and the retry picks up.
 *
 * Returns whether the inquiry is notified now.
 */
export async function notifyInquiry(inquiryId: string): Promise<boolean> {
  // Email not set up yet is a known state, not a failure: the inquiry waits in
  // the dashboard. Reported as an error, every inquiry would page someone.
  if (!isEmailConfigured) {
    logger.warn('contact.notification_skipped', { inquiryId, reason: 'mail_not_configured' });
    return false;
  }

  try {
    const inquiry = await prisma.contactInquiry.findUnique({
      where: { id: inquiryId },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        phone: true,
        interest: true,
        message: true,
        locale: true,
        createdAt: true,
        notifiedAt: true,
      },
    });

    if (!inquiry) return false;
    if (inquiry.notifiedAt) return true;

    // Three sources, most specific first: the address the admin set in
    // Settings, the deployment's own override, then the admin's own email. The
    // last is why CONTACT_INBOX_EMAIL is optional: notifications still reach a
    // real person by default.
    const inbox =
      (await getInquiryInbox()) ?? serverEnv.CONTACT_INBOX_EMAIL ?? serverEnv.ADMIN_EMAIL;

    const email = buildInquiryNotification({
      name: inquiry.name,
      company: inquiry.company,
      email: inquiry.email,
      phone: inquiry.phone,
      interest: inquiry.interest,
      message: inquiry.message,
      locale: inquiry.locale,
      submittedAt: inquiry.createdAt,
    });

    const sent = await sendEmail({
      purpose: `inquiry:${inquiry.id}`,
      idempotencyKey: `inquiry-${inquiry.id}`,
      to: inbox,
      subject: email.subject,
      html: email.html,
      text: email.text,
      // Replying in the mail client reaches the person who wrote in.
      replyTo: inquiry.email,
    });

    if (!sent.ok) {
      // Surfaced in the dashboard as "not notified"; the daily retry tries again.
      logger.error('contact.notification_failed', { inquiryId: inquiry.id });
      return false;
    }

    await prisma.contactInquiry.update({
      where: { id: inquiry.id },
      data: { notifiedAt: new Date() },
    });
    return true;
  } catch (error) {
    logger.error('contact.notification_failed', { inquiryId, ...serialiseError(error) });
    return false;
  }
}
