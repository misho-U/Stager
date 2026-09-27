import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';

import { cn } from '@/shared/lib/cn';

type ContactDetailsProps = {
  email: string | null;
  phone: string | null;
  address: string | null;
  className?: string;
};

/**
 * Email, phone and address from the dashboard's site settings. Each line is
 * left out when its setting is empty, and nothing renders when all are.
 */
export function ContactDetails({ email, phone, address, className }: ContactDetailsProps) {
  const lines = [
    email ? { key: 'email', Icon: EnvelopeSimpleIcon, text: email, href: `mailto:${email}` } : null,
    phone
      ? { key: 'phone', Icon: PhoneIcon, text: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` }
      : null,
    address?.trim() ? { key: 'address', Icon: MapPinIcon, text: address, href: null } : null,
  ].filter((line) => line !== null);

  if (lines.length === 0) return null;

  return (
    <ul className={cn('flex flex-col gap-2', className)}>
      {lines.map(({ key, Icon, text, href }) => (
        <li key={key} className="flex items-start gap-3">
          <Icon aria-hidden size="1.25em" className="text-ink-muted mt-0.5 shrink-0" />
          {href ? (
            <a
              href={href}
              className="decoration-line-strong hover:decoration-ink underline underline-offset-4 transition-colors"
            >
              {text}
            </a>
          ) : (
            <span>{text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
