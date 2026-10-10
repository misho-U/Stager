import { expect, test, type Page } from '@playwright/test';

import { ADMIN_SESSION, CREDENTIALS_PRESENT } from './admin-session';
import { DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON } from './db-guard';
import { courseInputSchema } from '@/entity/course/model/course.model';
import { todayInTbilisi } from '@/shared/lib/calendar-date';
import { describeIssue } from '@/shared/lib/validation-message';
import adminEn from '@pkg/i18n/messages/admin.en.json';

/**
 * Courses and videos: the owner keeps them in the dashboard, the site lists
 * them. The rules first (pure), then the dashboard flow, which needs an admin
 * session and writes to whatever database .env.local points at.
 */

/** A field by its whole label, required mark allowed. */
const labelled = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`);

/** A calendar day `days` after `day`, both "2026-10-02". */
const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const COURSE = {
  slug: 'rules-test',
  translations: { KA: { title: 'ტესტი' }, EN: { title: 'Test' } },
};

test.describe('course rules', () => {
  test('more seats left than seats in total is refused, at the seats-left field', () => {
    const result = courseInputSchema.safeParse({ ...COURSE, seatsTotal: 10, seatsLeft: 12 });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.path).toEqual(['seatsLeft']);
    expect(issue && describeIssue(issue)).toEqual({ key: 'seatsLeftOverTotal' });

    expect(courseInputSchema.safeParse({ ...COURSE, seatsTotal: 10, seatsLeft: 10 }).success).toBe(
      true,
    );
    // Either count alone is fine: the other is simply not shown.
    expect(courseInputSchema.safeParse({ ...COURSE, seatsLeft: 3 }).success).toBe(true);
  });

  test('a blank start date, category or service means none', () => {
    const parsed = courseInputSchema.parse({
      ...COURSE,
      startsAt: '',
      categoryId: '',
      serviceId: '',
    });
    expect(parsed.startsAt).toBeNull();
    expect(parsed.categoryId).toBeNull();
    expect(parsed.serviceId).toBeNull();
  });

  test("the site's day turns at Tbilisi midnight, not the server's", () => {
    // Tbilisi is UTC+4: 19:59 UTC is still the 1st there, 20:00 is the 2nd.
    expect(todayInTbilisi(new Date('2026-10-01T19:59:00Z'))).toBe('2026-10-01');
    expect(todayInTbilisi(new Date('2026-10-01T20:00:00Z'))).toBe('2026-10-02');
  });
});

test.describe('courses and videos in the dashboard', () => {
  test.skip(
    !CREDENTIALS_PRESENT,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the authenticated flow.',
  );
  test.skip(!DB_WRITES_ALLOWED, DB_WRITES_SKIP_REASON);
  test.use({ storageState: ADMIN_SESSION });

  // One category, one course and one video, created, changed and deleted in order.
  test.describe.configure({ mode: 'serial' });

  const stamp = Date.now();
  const category = { ka: `E2E კატეგორია ${stamp}`, en: `E2E category ${stamp}` };
  const course = { ka: `E2E კურსი ${stamp}`, en: `E2E course ${stamp}` };
  const video = { ka: `E2E ვიდეო ${stamp}`, en: `E2E video ${stamp}` };
  const form = adminEn.courses.form;

  const editEnglish = (page: Page) =>
    page
      .getByRole('group', { name: adminEn.contentLocale.label })
      .getByRole('button', { name: 'English' })
      .click();

  test('adds a course category from the Courses screen', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.getByRole('link', { name: adminEn.courses.categoriesLink }).click();
    await expect(page).toHaveURL(/\/admin\/courses\/categories$/);

    await page.getByLabel(labelled(adminEn.categories.nameKa)).fill(category.ka);
    await page.getByLabel(labelled(adminEn.categories.nameEn)).fill(category.en);
    await page.getByRole('button', { name: adminEn.courseCategories.add }).click();

    await expect(page.getByText(category.ka)).toBeVisible();
  });

  test('creates a published course; seats that do not add up are caught first', async ({
    page,
  }) => {
    await page.goto('/admin/courses/new');
    const georgian = page.locator('[data-content-locale="KA"]');
    const english = page.locator('[data-content-locale="EN"]');

    await georgian.getByLabel(labelled(adminEn.fields.title)).fill(course.ka);
    await georgian.getByLabel(labelled(form.duration.label)).fill('4 კვირა');
    await editEnglish(page);
    await english.getByLabel(labelled(adminEn.fields.title)).fill(course.en);
    await english.getByLabel(labelled(form.duration.label)).fill('4 weeks');

    await page.getByLabel(labelled(form.startsAt.label)).fill(addDays(todayInTbilisi(), 60));
    await page.getByLabel(labelled(form.seatsTotal.label)).fill('10');
    await page.getByLabel(labelled(form.seatsLeft.label)).fill('12');
    await page.getByLabel(labelled(form.price.label)).fill('450');
    await page.getByLabel(labelled(form.category.label)).selectOption({ label: category.ka });
    await page.getByLabel(labelled(adminEn.fields.status)).selectOption('PUBLISHED');

    await page.getByRole('button', { name: form.submit }).click();
    await expect(page.getByText(adminEn.validation.seatsLeftOverTotal)).toBeVisible();

    await page.getByLabel(labelled(form.seatsLeft.label)).fill('4');
    await page.getByRole('button', { name: form.submit }).click();

    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByRole('link', { name: course.ka })).toBeVisible();
  });

  test('the course appears on the site with its category, without a redeploy', async ({ page }) => {
    await page.goto('/en');
    const listed = page.getByTestId('course-list').locator('li', { hasText: course.en });
    await expect(listed).toBeVisible();
    await expect(listed).toContainText(category.en);
    await expect(listed).toContainText('4 weeks');

    await page.goto('/ka');
    await expect(page.getByTestId('course-list').getByText(course.ka)).toBeVisible();
  });

  test('once its start date has passed, the course leaves the site and the list says so', async ({
    page,
  }) => {
    await page.goto('/admin/courses');
    await page.getByRole('link', { name: course.ka }).click();
    const startsAt = page.getByLabel(labelled(form.startsAt.label));
    // The form fills itself once the record loads; a change made before that
    // would be overwritten.
    await expect(startsAt).not.toHaveValue('');
    await startsAt.fill(addDays(todayInTbilisi(), -1));
    await page.getByRole('button', { name: form.submit }).click();
    await expect(page).toHaveURL(/\/admin\/courses$/);

    const row = page.locator('tr', { hasText: course.ka });
    await expect(row.getByText(adminEn.courses.datePassed)).toBeVisible();

    await page.goto('/en');
    await expect(page.getByText(course.en)).toHaveCount(0);
  });

  test('without a date, a course is listed again, last', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.getByRole('link', { name: course.ka }).click();
    const startsAt = page.getByLabel(labelled(form.startsAt.label));
    await expect(startsAt).not.toHaveValue('');
    await startsAt.fill('');
    await page.getByRole('button', { name: form.submit }).click();
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(
      page.locator('tr', { hasText: course.ka }).getByText(adminEn.courses.noDate),
    ).toBeVisible();

    await page.goto('/en');
    await expect(page.getByTestId('course-list').getByText(course.en)).toBeVisible();
  });

  test('creates a video without its link yet, and the site lists it', async ({ page }) => {
    await page.goto('/admin/videos/new');
    const georgian = page.locator('[data-content-locale="KA"]');
    const english = page.locator('[data-content-locale="EN"]');

    // A new video starts on today's date.
    await expect(page.getByLabel(labelled(adminEn.videos.form.publishedAt.label))).toHaveValue(
      todayInTbilisi(),
    );
    await georgian.getByLabel(labelled(adminEn.fields.title)).fill(video.ka);
    await editEnglish(page);
    await english.getByLabel(labelled(adminEn.fields.title)).fill(video.en);
    await page.getByLabel(labelled(adminEn.fields.status)).selectOption('PUBLISHED');
    await page.getByRole('button', { name: adminEn.videos.form.submit }).click();

    await expect(page).toHaveURL(/\/admin\/videos$/);
    const row = page.locator('tr', { hasText: video.ka });
    await expect(row.getByText(adminEn.videos.noLink)).toBeVisible();

    // Both designs show the newest video in their #videos section, some of
    // its titles only on hover, so the section's text is what is checked.
    await page.goto('/ka');
    await expect(page.locator('#videos')).toContainText(video.ka);
  });

  test("a video's YouTube link can be added, and removed again", async ({ page }) => {
    const youtube = page.getByLabel(labelled(adminEn.videos.form.youtube.label));
    const openVideo = async () => {
      await page.goto('/admin/videos');
      await page.getByRole('link', { name: video.ka }).click();
      await expect(page.locator('[data-content-locale="KA"]').getByLabel(/^Title/)).toHaveValue(
        video.ka,
      );
    };

    await openVideo();
    await youtube.fill('https://www.vimeo.com/1');
    await page.getByRole('button', { name: adminEn.videos.form.submit }).click();
    await expect(page.getByText(adminEn.validation.youtube)).toBeVisible();

    await youtube.fill('https://youtu.be/dQw4w9WgXcQ');
    await page.getByRole('button', { name: adminEn.videos.form.submit }).click();
    await expect(page).toHaveURL(/\/admin\/videos$/);
    await expect(
      page.locator('tr', { hasText: video.ka }).getByText(adminEn.videos.noLink),
    ).toHaveCount(0);

    await openVideo();
    await youtube.fill('');
    await page.getByRole('button', { name: adminEn.videos.form.submit }).click();
    await expect(page).toHaveURL(/\/admin\/videos$/);
    await expect(
      page.locator('tr', { hasText: video.ka }).getByText(adminEn.videos.noLink),
    ).toBeVisible();
  });

  test('deleting the category keeps its course', async ({ page }) => {
    await page.goto('/admin/courses/categories');
    const row = page.locator('tr', { hasText: category.ka });
    await row.getByRole('button', { name: adminEn.common.delete }).click();
    await row.getByRole('button', { name: adminEn.common.confirm }).click();
    await expect(page.getByText(category.ka)).toHaveCount(0);

    await page.goto('/admin/courses');
    await expect(page.getByRole('link', { name: course.ka })).toBeVisible();
  });

  test('deletes the course and the video', async ({ page }) => {
    for (const [screen, title] of [
      ['/admin/courses', course.ka],
      ['/admin/videos', video.ka],
    ] as const) {
      await page.goto(screen);
      const row = page.locator('tr', { hasText: title });
      await row.getByRole('button', { name: adminEn.common.delete }).click();
      await row.getByRole('button', { name: adminEn.common.confirm }).click();
      await expect(page.getByRole('link', { name: title })).toHaveCount(0);
    }
  });
});
