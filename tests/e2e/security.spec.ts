import { expect, test } from '@playwright/test';

import { pageSectionLinkInput } from '@/entity/page/model/page.model';
import { safeRedirectTarget } from '@/modules/admin-login/admin-login.constants';
import { optionalUrlInput, urlInput, youtubeUrlSchema } from '@/shared/types/api';
import { sanitizeRichTextWith } from '@pkg/security/sanitize-options';

/**
 * Security rules that are plain functions, checked directly. What needs a
 * running server (headers, limits, the auth boundary) is in api-*.spec.ts.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Pure logic; once is enough.');
});

test.describe('after signing in, the dashboard only ever sends you into itself', () => {
  const STAYS = [
    ['/admin', '/admin'],
    ['/admin/settings', '/admin/settings'],
    ['/admin/projects?status=DRAFT#list', '/admin/projects?status=DRAFT#list'],
  ] as const;

  for (const [next, expected] of STAYS) {
    test(`${next} is kept`, () => {
      expect(safeRedirectTarget(next)).toBe(expected);
    });
  }

  const REFUSED = [
    null,
    '',
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    '\\\\evil.example',
    'https://evil.example/admin',
    'javascript:alert(1)',
    '/ka',
    '/admin/../ka',
    '/admin\\..\\..\\evil',
    '/admin/login',
    '/adminx',
  ];

  for (const next of REFUSED) {
    test(`${JSON.stringify(next)} lands on /admin instead`, () => {
      expect(safeRedirectTarget(next)).toBe('/admin');
    });
  }
});

test.describe('links an admin types are web links, never script', () => {
  const SCRIPT = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ];

  test('social, team and other plain links take http and https only', () => {
    expect(urlInput().safeParse(' https://instagram.com/stager ').data).toBe(
      'https://instagram.com/stager',
    );
    expect(optionalUrlInput().safeParse('').success).toBe(true);
    for (const value of [...SCRIPT, 'ftp://files.example.com/x']) {
      expect(urlInput().safeParse(value).success, value).toBe(false);
      expect(optionalUrlInput().safeParse(value).success, value).toBe(false);
    }
  });

  test('a YouTube link must really be one', () => {
    expect(youtubeUrlSchema.safeParse('https://www.youtube.com/watch?v=abcdefghijk').success).toBe(
      true,
    );
    expect(youtubeUrlSchema.safeParse('https://youtu.be/abcdefghijk').success).toBe(true);
    for (const value of [
      'javascript://www.youtube.com/%0Aalert(1)',
      'http://evil.example/youtube.com',
      'https://youtube.com.evil.example/watch',
    ]) {
      expect(youtubeUrlSchema.safeParse(value).success, value).toBe(false);
    }
  });

  test('a page button may point on the site, at a section, or at a web, mail or phone address', () => {
    for (const value of [
      '',
      '/ka/projects',
      '#inquiry',
      'https://stager.ge/en',
      'mailto:info@stager.ge',
      'tel:+995555000000',
    ]) {
      expect(pageSectionLinkInput().safeParse(value).success, value).toBe(true);
    }
    for (const value of [...SCRIPT, '//evil.example', ' javascript:alert(1)']) {
      expect(pageSectionLinkInput().safeParse(value).success, value).toBe(false);
    }
  });
});

test.describe('rich text keeps formatting and loses anything that runs', () => {
  const STORE_HOST = 'abc123.public.blob.vercel-storage.com';
  const clean = (html: string) => sanitizeRichTextWith(html, { imageHosts: [STORE_HOST] });

  test('scripts, handlers and script links are stripped', () => {
    const out = clean(
      '<p onclick="x()">Hi<script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror="alert(1)"></p>',
    );
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain('Hi');
  });

  test('a link that opens a new tab cannot reach back to this one', () => {
    const out = clean(
      '<a href="https://example.com" target="_BLANK" rel="opener">a</a><a href="https://example.com" target="popup">b</a>',
    );
    expect(out).toContain('target="_blank" rel="noopener noreferrer"');
    expect(out).not.toContain('opener"');
    expect(out).not.toContain('popup');
  });

  test('images come only from the site’s own store', () => {
    const own = `https://${STORE_HOST}/media/a.jpg`;
    const out = clean(
      `<p><img src="${own}" alt="ok"><img src="https://tracker.example/p.gif" alt="no"></p>`,
    );
    expect(out).toContain(own);
    expect(out).not.toContain('tracker.example');
  });
});
