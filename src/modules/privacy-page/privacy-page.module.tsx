import { getTranslations } from 'next-intl/server';

import { PRIVACY_PATH, privacyPolicy } from '@/entity/page/model/page.model';
import { loadPrivacyPageData } from '@/modules/privacy-page/privacy-page.service';
import { PendingSlot } from '@/shared/components/pending-slot';
import { RichText } from '@/shared/components/rich-text';
import type { DbLocale } from '@/shared/types/enums';
import { toAppLocale } from '@pkg/i18n/routing';
import { PageHero, SubpageShell } from '@/widgets/site-chrome/site-chrome.module';

type PrivacyPageModuleProps = { locale: DbLocale };

/**
 * The privacy policy, in the site's design: the policy as the owner wrote it
 * in the dashboard (Page copy → Privacy policy). Until it is written the
 * page says so, and nothing links here (the footer and the contact form
 * check the same text).
 */
export async function PrivacyPageModule({ locale }: PrivacyPageModuleProps) {
  const [{ chrome, page, readFailed }, t] = await Promise.all([
    loadPrivacyPageData(locale),
    getTranslations(),
  ]);
  const policy = privacyPolicy(page);
  const title = policy?.heading || page?.title || t('privacy.title');

  return (
    <SubpageShell
      locale={locale}
      chrome={chrome}
      readFailed={readFailed}
      current={`/${toAppLocale(locale)}${PRIVACY_PATH}`}
    >
      <PageHero title={title} testId="privacy-title" />
      <div className="px-gutter pb-section">
        <div className="max-w-page mx-auto">
          {policy ? (
            <RichText html={policy.body} className="ct-prose" />
          ) : (
            <PendingSlot
              label={t('privacy.pending')}
              hint={t('privacy.pendingHint')}
              className="max-w-xl"
            />
          )}
        </div>
      </div>
    </SubpageShell>
  );
}
