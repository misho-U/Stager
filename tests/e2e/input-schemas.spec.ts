import { expect, test } from '@playwright/test';

import { insightInputSchema } from '@/entity/insight/model/insight.model';
import { projectInputSchema } from '@/entity/project/model/project.model';
import { serviceUpdateInputSchema } from '@/entity/service/model/service.model';
import {
  socialLinkInputSchema,
  socialLinkUpdateInputSchema,
} from '@/entity/social-link/model/social-link.model';
import { describeIssue } from '@/shared/lib/validation-message';

/**
 * How the dashboard's input schemas read what a form sends. Pure: no server.
 *
 * Both rules below were bugs a person could hit from the dashboard, and both
 * hid behind schemas that looked right: zod 4 applies `.default()` inside
 * `.partial()`, and an emptied input or a "none" option sends "".
 */

test.describe('a partial update changes only what it names', () => {
  test('hiding a social link keeps its place in the list', () => {
    // The Social links screen sends exactly this. `.partial()` alone added
    // order: 0, and the link jumped to the top of the site's list.
    expect(socialLinkUpdateInputSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });

  test('a one-field update does not set a record back to draft', () => {
    expect(serviceUpdateInputSchema.parse({ icon: 'kitchen' })).toEqual({ icon: 'kitchen' });
  });

  test('creating still fills in the defaults', () => {
    expect(socialLinkInputSchema.parse({ platform: 'X', url: 'https://x.com/stager' })).toEqual({
      platform: 'X',
      url: 'https://x.com/stager',
      order: 0,
      isActive: true,
    });
  });
});

test.describe('an emptied optional field means none', () => {
  const project = {
    slug: 'clearing-test',
    translations: { KA: { title: 'ტესტი' }, EN: { title: 'Test' } },
  };

  test('a YouTube link can be removed', () => {
    for (const youtubeUrl of ['', '   ']) {
      expect(projectInputSchema.parse({ ...project, youtubeUrl }).youtubeUrl).toBeNull();
    }
    expect(
      projectInputSchema.parse({ ...project, youtubeUrl: ' https://youtu.be/dQw4w9WgXcQ ' })
        .youtubeUrl,
    ).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  test('any other link still fails, and says it must be YouTube', () => {
    const result = projectInputSchema.safeParse({ ...project, youtubeUrl: 'https://vimeo.com/1' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((item) => item.path[0] === 'youtubeUrl');
    expect(issue && describeIssue(issue)).toEqual({ key: 'youtube' });
  });

  test('"no category" and "no author" can be chosen again', () => {
    const parsed = insightInputSchema.parse({
      slug: 'clearing-test',
      categoryId: '',
      authorId: '',
      translations: { KA: { title: 'ტესტი' }, EN: { title: 'Test' } },
    });
    expect(parsed.categoryId).toBeNull();
    expect(parsed.authorId).toBeNull();
  });
});
