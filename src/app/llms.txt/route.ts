import { buildLlmsTxt } from '@/modules/llms-txt/llms-txt.service';

/*
 * Built at build time like the pages, from the same cached, tagged reads, and
 * rebuilt when a save purges one of them.
 */

/** The site for AI assistants (llmstxt.org); see the module for what it holds. */
export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
