import { ChalkboardTeacherIcon } from '@phosphor-icons/react/dist/ssr/ChalkboardTeacher';
import { CompassIcon } from '@phosphor-icons/react/dist/ssr/Compass';
import { CookingPotIcon } from '@phosphor-icons/react/dist/ssr/CookingPot';
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import type { IconWeight } from '@phosphor-icons/react';

/**
 * The icon for a service, by the `icon` key stored on it in the dashboard.
 * An unknown or empty key renders nothing rather than a generic stand-in.
 */
const ICONS = {
  concept: CompassIcon,
  menu: ForkKnifeIcon,
  kitchen: CookingPotIcon,
  training: ChalkboardTeacherIcon,
  haccp: ShieldCheckIcon,
} as const;

/** Whether a stored icon key has an icon, so a layout can skip the badge. */
export function hasServiceIcon(name: string | null): boolean {
  return name !== null && name in ICONS;
}

export function ServiceIcon({
  name,
  weight = 'light',
  className,
}: {
  name: string | null;
  weight?: IconWeight;
  className?: string;
}) {
  const Icon = hasServiceIcon(name) ? ICONS[name as keyof typeof ICONS] : null;
  return Icon ? <Icon aria-hidden size="1em" weight={weight} className={className} /> : null;
}
