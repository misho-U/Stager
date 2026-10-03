import { readJson, withPublic } from '@/app/api/_lib/route-helpers';
import { getInquiryInbox } from '@/app/api/_lib/repositories/site-setting.repository';
import {
  contactSubmissionSchema,
  MIN_FORM_FILL_MS,
} from '@/entity/contact-inquiry/model/contact-inquiry.model';
import { deliversInquiriesHere, serverEnv } from '@pkg/config/env.server';
import { prisma } from '@pkg/db/prisma';
import { apiFail, apiOk } from '@pkg/http/api-response';
import { logger } from '@pkg/logger';
import { buildInquiryNotification } from '@pkg/mail/templates/inquiry-notification';
import { sendEmail } from '@pkg/mail/resend';
import { checkRateLimit, RATE_LIMITS } from '@pkg/ratelimit/limiter';
import { getClientIp, getUserAgent, hashIp, isSameOriginRequest } from '@pkg/security/request';
import { sanitizePlainText } from '@pkg/security/sanitize';

export const dynamic = 'force-dynamic';

/**
 * Public contact form.
 *
 * Three layers of abuse protection, cheapest first: a honeypot field, a
 * minimum fill time, and a per-IP rate limit. None of them needs a captcha
 * vendor, and together they stop the overwhelming majority of form spam.
 *
 * The submission is persisted BEFORE the notification email is attempted. If
 * Resend is down, the inquiry is still in the database with notifiedAt unset,
 * visible in the dashboard, and the visitor is still told it went through —
 * because it did. Losing a lead to an email outage would be the worse failure.
 */
export const POST = withPublic(async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return apiFail('FORBIDDEN', 'Cross-site request rejected');
  }

  // A message at its longest, in Georgian, is about 15 KB.
  const parsed = await readJson(request, contactSubmissionSchema, { maxBytes: 32 * 1024 });
  if (!parsed.ok) return parsed.response;

  const submission = parsed.data;

  // Honeypot: hidden from people, irresistible to naive bots. Answer 200 so a
  // bot cannot tell it was caught and retune.
  if (submission.website && submission.website.length > 0) {
    logger.warn('contact.honeypot_triggered', {});
    return apiOk({ ok: true as const, id: 'accepted' });
  }

  // The site's form always reports how long it was open; a submission that
  // does not came from somewhere else, and is treated like one that was too
  // fast rather than let through by leaving the field out.
  if (submission.elapsedMs === undefined || submission.elapsedMs < MIN_FORM_FILL_MS) {
    logger.warn('contact.too_fast', { elapsedMs: submission.elapsedMs });
    return apiOk({ ok: true as const, id: 'accepted' });
  }

  // A preview or a dev server shares the live database and inbox, so storing
  // this would put a test in front of the client as a real lead
  // (pkg/config/inquiry-delivery.ts). Checked after validation, so the form
  // still behaves fully on a preview, and before anything is written.
  if (!deliversInquiriesHere) {
    logger.info('contact.delivery_off', {});
    return apiFail('FORBIDDEN', 'This deployment does not deliver contact submissions', {
      reason: 'DELIVERY_OFF',
    });
  }

  const ipHash = hashIp(getClientIp(request));
  const limit = await checkRateLimit({
    key: `contact:${ipHash ?? 'unknown'}`,
    ...RATE_LIMITS.contactForm,
  });

  if (!limit.ok) {
    return apiFail('RATE_LIMITED', 'Too many messages. Please try again later.', {
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
  }

  // Stored as plain text and rendered as plain text, but stripped anyway: this
  // content is read in an email client and in the dashboard, and neither should
  // ever receive markup from an anonymous submitter.
  const inquiry = await prisma.contactInquiry.create({
    data: {
      name: sanitizePlainText(submission.name),
      company: submission.company ? sanitizePlainText(submission.company) : null,
      email: submission.email.toLowerCase(),
      phone: submission.phone ? sanitizePlainText(submission.phone) : null,
      interest: submission.interest,
      message: sanitizePlainText(submission.message),
      locale: submission.locale,
      ipHash,
      userAgent: getUserAgent(request),
    },
    select: { id: true, name: true, company: true, email: true, phone: true, createdAt: true },
  });

  // Three sources, most specific first: the address the admin set in Settings,
  // the deployment's own override, then the admin's own email. The last is why
  // CONTACT_INBOX_EMAIL is optional — one fewer variable to get right on a new
  // deployment, and notifications still reach a real person by default.
  const inbox = (await getInquiryInbox()) ?? serverEnv.CONTACT_INBOX_EMAIL ?? serverEnv.ADMIN_EMAIL;

  const email = buildInquiryNotification({
    name: inquiry.name,
    company: inquiry.company,
    email: inquiry.email,
    phone: inquiry.phone,
    interest: submission.interest,
    message: sanitizePlainText(submission.message),
    locale: submission.locale,
    submittedAt: inquiry.createdAt,
  });

  const sent = await sendEmail({
    purpose: `inquiry:${inquiry.id}`,
    to: inbox,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Replying in the mail client reaches the person who wrote in.
    replyTo: inquiry.email,
  });

  if (sent.ok) {
    await prisma.contactInquiry.update({
      where: { id: inquiry.id },
      data: { notifiedAt: new Date() },
    });
  } else {
    // Surfaced in the dashboard as "not notified" so it can be chased manually.
    logger.error('contact.notification_failed', { inquiryId: inquiry.id });
  }

  return apiOk({ ok: true as const, id: inquiry.id });
});
