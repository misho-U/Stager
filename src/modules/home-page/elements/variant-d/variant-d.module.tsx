import { Wordmark } from '@/shared/components/wordmark';

/** TEMPORARY placeholder while this design is being built. */
export async function VariantD(_props: { locale: unknown; content: unknown }) {
  return (
    <main className="px-gutter py-section mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-4">
      <Wordmark />
      <p className="text-title">ეს ვარიანტი მზადდება.</p>
    </main>
  );
}
