import { Prisma } from '@prisma/client';
import { expect, test } from '@playwright/test';

import { prismaErrorSummary, withheldPrismaError } from '@pkg/db/errors';
import { describeMailRejection } from '@pkg/mail/rejection';
import { scrubEvent } from '@pkg/monitoring/options';
import { redactText } from '@pkg/monitoring/redact';

/**
 * Error reports keep no email address or phone number, wherever in the event
 * it hides. The scrubber already drops a request's body; these are the
 * places an error's own words can quote it. See pkg/monitoring/redact.ts.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Pure functions; once is enough.');
});

const EMAIL = 'visitor@example.com';
const PHONES = ['+995 555 12 34 56', '555123456', '(+995) 599-12-34-56', '+1 (415) 555-0132'];

test('an event with an email or a phone number in it reaches Sentry redacted', () => {
  const event = scrubEvent({
    type: undefined,
    message: `Could not reach ${EMAIL} on ${PHONES[0]}`,
    logentry: { message: 'Inquiry from %s', params: [EMAIL] },
    exception: {
      values: [
        { type: 'Error', value: `Invalid \`to\` field: ${EMAIL}` },
        { type: 'Error', value: `Phone ${PHONES[1]} refused` },
      ],
    },
    extra: {
      inquiry: { email: EMAIL, phone: PHONES[2], note: ['call', PHONES[3]] },
      inquiryId: 'cm1x2y3z4000008l4abcd1234',
    },
    breadcrumbs: [
      { category: 'console', message: `{"to":"${EMAIL}"}`, data: { arguments: [PHONES[1]] } },
    ],
  });

  const sent = JSON.stringify(event);
  expect(sent).not.toContain(EMAIL);
  for (const phone of PHONES) expect(sent).not.toContain(phone);
  expect(event.message).toBe('Could not reach [email] on [phone]');
  expect(event.exception?.values?.map((value) => value.value)).toEqual([
    'Invalid `to` field: [email]',
    'Phone [phone] refused',
  ]);
  expect(event.extra).toEqual({
    inquiry: { email: '[email]', phone: '[phone]', note: ['call', '[phone]'] },
    // An id is not a phone number, digits and all.
    inquiryId: 'cm1x2y3z4000008l4abcd1234',
  });
  expect(event.breadcrumbs?.[0]?.message).toBe('{"to":"[email]"}');
});

test('dates, times, versions and ids are not taken for phone numbers', () => {
  for (const text of [
    '2026-10-18T10:32:00.123Z',
    '2026-10-18 10:32:00',
    'next 16.0.1, sentry 11.4.0',
    'at handler (route.js:120:34)',
    'took 1234 ms, P2002',
    'clxyz0123456789abcdef',
    '@sentry/nextjs@11.4.0 in node_modules/@prisma/client',
  ]) {
    expect(redactText(text)).toBe(text);
  }
});

test('a database error is reported by its code and model, never by its message', () => {
  const error = new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed: Key (email)=(${EMAIL}), phone ${PHONES[0]}, message "Call me"`,
    {
      code: 'P2002',
      clientVersion: Prisma.prismaVersion.client,
      meta: { modelName: 'ContactInquiry' },
    },
  );

  expect(prismaErrorSummary(error)).toEqual({
    name: 'PrismaClientKnownRequestError',
    code: 'P2002',
    model: 'ContactInquiry',
  });

  const reported = withheldPrismaError(error) as Error;
  expect(reported.message).toBe('P2002 on ContactInquiry (message withheld)');
  expect(reported.name).toBe('PrismaClientKnownRequestError');
  // The stack keeps where it came from, and none of what it said.
  expect(reported.stack).toMatch(/^PrismaClientKnownRequestError: P2002 on ContactInquiry/);
  expect(reported.stack).toContain('    at ');
  for (const quoted of [EMAIL, PHONES[0], 'Call me']) expect(reported.stack).not.toContain(quoted);

  // Anything that is not Prisma's passes through as it was.
  const other = new Error('fetch failed');
  expect(prismaErrorSummary(other)).toBeNull();
  expect(withheldPrismaError(other)).toBe(other);
});

test('a validation error, which prints the whole query, is withheld too', () => {
  const error = new Prisma.PrismaClientValidationError(
    `Invalid \`prisma.contactInquiry.create()\` invocation:\n{ data: { email: "${EMAIL}", phone: "${PHONES[1]}" } }`,
    { clientVersion: Prisma.prismaVersion.client },
  );
  const reported = withheldPrismaError(error) as Error;
  expect(reported.message).toBe('no code on an unknown model (message withheld)');
  expect(reported.stack).not.toContain(EMAIL);
  expect(reported.stack).not.toContain(PHONES[1]);
});

test('a mail rejection is logged by its code, without the address', () => {
  const rejection = describeMailRejection({
    name: 'validation_error',
    statusCode: 422,
    message: `Invalid \`to\` field. The email address needs to follow the \`email@example.com\` format: ${EMAIL}`,
  });
  expect(rejection).toEqual({ code: 'validation_error', status: 422 });
  expect(JSON.stringify(rejection)).not.toContain(EMAIL);
});
