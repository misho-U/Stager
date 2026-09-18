/**
 * Contact-form notification, sent to the STAGER inbox.
 *
 * Plain template strings rather than a React email renderer: this is one
 * internal notification with no branding requirements, and every value below is
 * escaped by hand so a submitted name containing markup cannot inject anything
 * into the recipient's mail client.
 */

type InquiryEmailInput = {
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  interestLabel: string;
  message: string;
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
      <td style="padding:6px 16px 6px 0;color:#8EA3A5;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#1D464A;font-size:14px;">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildInquiryNotification(input: InquiryEmailInput) {
  const subject = `New inquiry — ${input.name}${input.company ? ` (${input.company})` : ''}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#EFEEE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;">
      <p style="margin:0 0 4px;color:#8EA3A5;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">STAGER</p>
      <h1 style="margin:0 0 20px;color:#1D464A;font-size:20px;font-weight:600;">New project inquiry</h1>
      <table style="width:100%;border-collapse:collapse;">
        ${row('Name', input.name)}
        ${row('Company', input.company)}
        ${row('Email', input.email)}
        ${row('Phone', input.phone)}
        ${row('Interest', input.interestLabel)}
        ${row('Language', input.locale.toUpperCase())}
        ${row('Received', input.submittedAt.toISOString())}
      </table>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #EFEEE6;">
        <p style="margin:0 0 8px;color:#8EA3A5;font-size:13px;">Message</p>
        <p style="margin:0;color:#1D464A;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
      </div>
      <p style="margin:24px 0 0;color:#8EA3A5;font-size:12px;">
        Reply directly to this email to reach the sender.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    'New project inquiry — STAGER',
    '',
    `Name:     ${input.name}`,
    input.company ? `Company:  ${input.company}` : null,
    `Email:    ${input.email}`,
    input.phone ? `Phone:    ${input.phone}` : null,
    `Interest: ${input.interestLabel}`,
    `Language: ${input.locale.toUpperCase()}`,
    `Received: ${input.submittedAt.toISOString()}`,
    '',
    'Message:',
    input.message,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text };
}
