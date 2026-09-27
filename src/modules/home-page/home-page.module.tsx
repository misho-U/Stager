import { getTranslations } from 'next-intl/server';

import { VariantA } from '@/modules/home-page/elements/variant-a/variant-a.module';
import { VariantB } from '@/modules/home-page/elements/variant-b/variant-b.module';
import { VariantC } from '@/modules/home-page/elements/variant-c/variant-c.module';
import { HOME_VARIANT_PARAM, HOME_VARIANTS } from '@/modules/home-page/home-page.constants';
import { loadHomePageData, parseHomeVariant } from '@/modules/home-page/home-page.service';
import { ReadFailureNotice } from '@/shared/components/read-failure-notice';
import type { DbLocale } from '@/shared/types/enums';
import { DesignVariantSwitcher } from '@/widgets/design-variant-switcher/design-variant-switcher.module';

/** TEMPORARY — one composition per design under comparison. */
const COMPOSITIONS = { a: VariantA, b: VariantB, c: VariantC } as const;

type HomePageModuleProps = {
  locale: DbLocale;
  /** TEMPORARY — the raw `?v=` value, see home-page.constants.ts. */
  variant?: string | string[] | undefined;
};

/**
 * The home page. All three designs render the same data from the same reads;
 * they differ in tokens (src/shared/brandbook/variants/) and composition
 * (./elements/variant-*). Content edited in /admin appears in all three.
 */
export async function HomePageModule({ locale, variant: requested }: HomePageModuleProps) {
  const [content, t] = await Promise.all([loadHomePageData(locale), getTranslations('home')]);
  const variant = parseHomeVariant(requested);
  const Composition = COMPOSITIONS[variant];

  return (
    <>
      {/* The design's tokens apply inside this element only. */}
      <div data-home-variant={variant} className="bg-surface text-ink">
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
