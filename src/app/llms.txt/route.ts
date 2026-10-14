import { buildLlmsTxt } from '@/modules/llms-txt/llms-txt.service';

/**
 * Per request, like the sitemap: built from the API, which is not listening
 * while `next build` runs. The reads behind it are cached and tagged.
 */
export const dynamic = 'force-dynamic';

/** The site for AI assistants (llmstxt.org); see the module for what it holds. */
export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
