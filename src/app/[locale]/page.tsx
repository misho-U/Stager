import { HomePageModule } from '@/modules/home-page/home-page.module';
import { isAppLocale, toDbLocale, DEFAULT_LOCALE } from '@pkg/i18n/routing';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const appLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;

  return <HomePageModule locale={toDbLocale(appLocale)} />;
}
