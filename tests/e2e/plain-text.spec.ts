import { expect, test } from '@playwright/test';

import { teamMemberInputSchema } from '@/entity/team-member/model/team-member.model';
import { htmlToPlainText } from '@/shared/lib/plain-text';

/**
 * A plain-text field shows what was typed. HTML pasted into one (from a rich
 * editor, another site) once reached the team page as "<p>…<br />…", tags
 * and all, in the middle of a bio. Saving turns it back into the text.
 */

test.describe('pasted HTML in a plain-text field', () => {
  test('becomes the text it shows, breaks kept as lines', () => {
    expect(htmlToPlainText('<p>სოფია ისაკაძე</p><p>Leads marketing.<br />“Quote”</p>')).toBe(
      'სოფია ისაკაძე\nLeads marketing.\n“Quote”\n',
    );
    expect(htmlToPlainText('<p>Food&nbsp;&amp;&nbsp;drink</p>')).toBe('Food & drink\n');
    expect(htmlToPlainText('<ul><li>One</li><li>Two</li></ul>')).toBe('• One\n• Two\n');
  });

  test('leaves text with no tag in it alone, a < or > included', () => {
    for (const text of ['10 < 20 > 5', 'Line one\nLine two', 'A & B', '<3 the kitchen']) {
      expect(htmlToPlainText(text)).toBe(text);
    }
  });

  test('is what a saved bio holds: plain, trimmed', () => {
    const parsed = teamMemberInputSchema.parse({
      slug: 'sofia',
      translations: {
        KA: { name: 'სოფია', bio: '<p>პირველი.</p><p>მეორე.<br />მესამე.</p>' },
        EN: { name: 'Sofia', bio: 'Already plain.' },
      },
    });
    expect(parsed.translations.KA.bio).toBe('პირველი.\nმეორე.\nმესამე.');
    expect(parsed.translations.EN.bio).toBe('Already plain.');
  });
});
