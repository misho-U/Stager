import { getTranslations } from 'next-intl/server';

import { OpenKitchen } from '@/modules/home-page/elements/open-kitchen/open-kitchen.module';
import { HOME_VARIANT_PARAM, HOME_VARIANTS } from '@/modules/home-page/home-page.constants';
import { loadHomePageData, parseHomeVariant } from '@/modules/home-page/home-page.service';
import { ReadFailureNotice } from '@/shared/components/read-failure-notice';
import type { DbLocale } from '@/shared/types/enums';
import { DesignVariantSwitcher } from '@/widgets/design-variant-switcher/design-variant-switcher.module';

/** TEMPORARY — one composition per design under comparison. */
const COMPOSITIONS = { '1': OpenKitchen } as const;

type HomePageModuleProps = {
  locale: DbLocale;
  /** TEMPORARY — the raw `?v=` value, see home-page.constants.ts. */
  variant?: string | string[] | undefined;
};

/**
 * The home page. Both designs render the same data from the same reads; they
 * differ in tokens (src/shared/brandbook/variants/), composition and motion
 * (./elements/open-kitchen, ./elements/chefs-table). Content edited in /admin
 * appears in both.
 */
export async function HomePageModule({ locale, variant: requested }: HomePageModuleProps) {
  const [content, t] = await Promise.all([loadHomePageData(locale), getTranslations('home')]);
  const variant = parseHomeVariant(requested);
  const Composition = COMPOSITIONS[variant];

  return (
    <>
      {/* The design's tokens apply inside this element only. `key` gives each
          design a fresh element, so no motion state carries across a switch.
          `overflow-x-clip`: a card thrown off the board must never widen the
          page; unlike `hidden` it keeps sticky and pinned scenes working. */}
      <div
        key={variant}
        data-home-variant={variant}
        className="bg-surface text-ink overflow-x-clip"
      >
        {content.readFailed ? <ReadFailureNotice message={t('readFailed')} /> : null}
        <Composition locale={locale} content={content} />
      </div>

      <DesignVariantSwitcher
        current={variant}
        variants={HOME_VARIANTS}
        param={HOME_VARIANT_PARAM}
      />
    </>
  );
}
