/**
 * Database seed.
 *
 * Idempotent: every write is an upsert keyed on a natural identifier, so
 * running `pnpm db:seed` twice changes nothing the second time. Safe to run
 * against production to (re)install the baseline structure — it never deletes
 * and never overwrites editorial copy that already exists beyond the fields it
 * owns.
 *
 * This script deliberately builds its own PrismaClient rather than importing
 * pkg/db: that module is marked `server-only`, which throws outside a React
 * Server Component, and a seed run by tsx is neither.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DIRECT_URL (or DATABASE_URL) is not set. Run the seed through `pnpm db:seed`, which loads .env.local.',
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SINGLETON_ID = 'singleton';

type Bilingual<T> = { KA: T; EN: T };

// ---------------------------------------------------------------------------
// Admin allowlist
// ---------------------------------------------------------------------------

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();

  if (!email) {
    console.warn(
      '[seed] ADMIN_EMAIL is not set — skipping the admin allowlist. Nobody will be able to sign in to /admin until it is seeded.',
    );
    return;
  }

  const admin = await prisma.adminUser.upsert({
    where: { email },
    // Never demote or reactivate on re-seed; only fill in a missing name.
    update: { name: process.env.ADMIN_NAME ?? undefined },
    create: {
      email,
      name: process.env.ADMIN_NAME ?? 'Site Owner',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.warn(`[seed] admin allowlist: ${admin.email} (${admin.role})`);
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

async function seedSiteSettings() {
  await prisma.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, contactEmail: 'info@stager.ge' },
  });

  const copy: Bilingual<{
    siteName: string;
    tagline: string;
    footerText: string;
    metaTitle: string;
    metaDescription: string;
  }> = {
    KA: {
      siteName: 'STAGER',
      tagline: 'Building Better Food Businesses',
      footerText: 'STAGER — კულინარიული და ფუდსერვის განვითარება.',
      metaTitle: 'STAGER — კულინარიული და ფუდსერვის განვითარება',
      metaDescription:
        'STAGER ეხმარება კვების ბიზნესებს კონცეფციის შემუშავებაში, მენიუს განვითარებაში, სამზარეულოს ოპერაციებში, ტრენინგსა და HACCP-ის დანერგვაში.',
    },
    EN: {
      siteName: 'STAGER',
      tagline: 'Building Better Food Businesses',
      footerText: 'STAGER — Culinary & Foodservice Development.',
      metaTitle: 'STAGER — Culinary & Foodservice Development',
      metaDescription:
        'STAGER helps food businesses with concept development, menu development, kitchen operations, training and HACCP implementation.',
    },
  };

  for (const locale of ['KA', 'EN'] as const) {
    await prisma.siteSettingTranslation.upsert({
      where: { siteSettingId_locale: { siteSettingId: SINGLETON_ID, locale } },
      update: {},
      create: { siteSettingId: SINGLETON_ID, locale, ...copy[locale] },
    });
  }

  console.warn('[seed] site settings');
}

// ---------------------------------------------------------------------------
// Services — the five lines named in the brief
// ---------------------------------------------------------------------------

const SERVICES: Array<{
  slug: string;
  icon: string;
  order: number;
  copy: Bilingual<{ title: string; shortDescription: string }>;
}> = [
  {
    slug: 'concept-development',
    icon: 'concept',
    order: 1,
    copy: {
      KA: {
        title: 'კონცეფცია და განვითარება',
        shortDescription:
          'იდეიდან სამუშაო ბიზნეს-მოდელამდე: პოზიციონირება, კონცეფცია და გაშვების გეგმა.',
      },
      EN: {
        title: 'Concept & Development',
        shortDescription:
          'From an idea to a working business model: positioning, concept and a launch plan.',
      },
    },
  },
  {
    slug: 'menu-development',
    icon: 'menu',
    order: 2,
    copy: {
      KA: {
        title: 'მენიუს შემუშავება',
        shortDescription:
          'მენიუ, რომელიც ერთდროულად ემსახურება სტუმარსაც და თვითღირებულებასაც.',
      },
      EN: {
        title: 'Menu Development',
        shortDescription: 'Menus engineered for the guest experience and the cost line alike.',
      },
    },
  },
  {
    slug: 'kitchen-operations',
    icon: 'kitchen',
    order: 3,
    copy: {
      KA: {
        title: 'სამზარეულო და ოპერაციები',
        shortDescription: 'სამზარეულოს დაგეგმარება, პროცესები და ყოველდღიური ოპერაციული წესრიგი.',
      },
      EN: {
        title: 'Kitchen & Operations',
        shortDescription: 'Kitchen layout, process design and the daily operating discipline.',
      },
    },
  },
  {
    slug: 'training-team-development',
    icon: 'training',
    order: 4,
    copy: {
      KA: {
        title: 'ტრენინგი და გუნდის განვითარება',
        shortDescription: 'გუნდი, რომელიც სტანდარტს ინარჩუნებს მაშინაც, როცა ჩვენ აღარ ვართ.',
      },
      EN: {
        title: 'Training & Team Development',
        shortDescription: 'Teams that hold the standard long after we have left the building.',
      },
    },
  },
  {
    slug: 'food-safety-haccp',
    icon: 'haccp',
    order: 5,
    copy: {
      KA: {
        title: 'კვების უსაფრთხოება და HACCP',
        shortDescription: 'HACCP-ის დანერგვა, დოკუმენტაცია და შემოწმებისთვის მზადყოფნა.',
      },
      EN: {
        title: 'Food Safety & HACCP',
        shortDescription: 'HACCP implementation, documentation and inspection readiness.',
      },
    },
  },
];

async function seedServices() {
  for (const service of SERVICES) {
    const record = await prisma.service.upsert({
      where: { slug: service.slug },
      update: { icon: service.icon, order: service.order },
      create: {
        slug: service.slug,
        icon: service.icon,
        order: service.order,
        status: 'PUBLISHED',
      },
    });

    for (const locale of ['KA', 'EN'] as const) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: record.id, locale } },
        update: {},
        create: { serviceId: record.id, locale, ...service.copy[locale] },
      });
    }
  }

  console.warn(`[seed] ${SERVICES.length} services`);
}

// ---------------------------------------------------------------------------
// Pages and their editable sections
// ---------------------------------------------------------------------------

const PAGES: Array<{
  key: 'HOME' | 'ABOUT' | 'SERVICES' | 'PROJECTS' | 'TEAM' | 'INSIGHTS' | 'CONTACT';
  title: Bilingual<string>;
  sections: Array<{
    key: string;
    order: number;
    copy: Bilingual<{ heading: string; subheading?: string; ctaLabel?: string; ctaHref?: string }>;
  }>;
}> = [
  {
    key: 'HOME',
    title: { KA: 'მთავარი', EN: 'Home' },
    sections: [
      {
        key: 'hero',
        order: 1,
        copy: {
          KA: {
            heading: 'Building Better Food Businesses.',
            subheading: 'Culinary & Foodservice Development',
            ctaLabel: 'დაიწყე პროექტი',
            ctaHref: '/contact',
          },
          EN: {
            heading: 'Building Better Food Businesses.',
            subheading: 'Culinary & Foodservice Development',
            ctaLabel: 'Start a Project',
            ctaHref: '/contact',
          },
        },
      },
      {
        key: 'intro',
        order: 2,
        copy: {
          KA: { heading: 'ვინ არის STAGER' },
          EN: { heading: 'Who STAGER is' },
        },
      },
      {
        key: 'what-we-do',
        order: 3,
        copy: { KA: { heading: 'რას ვთავაზობთ' }, EN: { heading: 'What We Do' } },
      },
      {
        key: 'selected-projects',
        order: 4,
        copy: { KA: { heading: 'შერჩეული პროექტები' }, EN: { heading: 'Selected Projects' } },
      },
      {
        key: 'why-stager',
        order: 5,
        copy: { KA: { heading: 'რატომ STAGER' }, EN: { heading: 'Why STAGER' } },
      },
      {
        key: 'insights',
        order: 6,
        copy: { KA: { heading: 'უახლესი კონტენტი' }, EN: { heading: 'Latest Insights' } },
      },
      {
        key: 'cta',
        order: 7,
        copy: {
          KA: { heading: 'დაიწყე პროექტი', ctaLabel: 'დაიწყე საუბარი', ctaHref: '/contact' },
          EN: { heading: 'Start a Project', ctaLabel: 'Start a Conversation', ctaHref: '/contact' },
        },
      },
    ],
  },
  {
    key: 'ABOUT',
    title: { KA: 'ჩვენ შესახებ', EN: 'About' },
    sections: [
      {
        key: 'story',
        order: 1,
        copy: { KA: { heading: 'ჩვენი ისტორია' }, EN: { heading: 'Our story' } },
      },
      {
        key: 'approach',
        order: 2,
        copy: { KA: { heading: 'ჩვენი მიდგომა' }, EN: { heading: 'Our approach' } },
      },
    ],
  },
  {
    key: 'SERVICES',
    title: { KA: 'მომსახურება', EN: 'Services' },
    sections: [
      {
        key: 'intro',
        order: 1,
        copy: { KA: { heading: 'მომსახურება' }, EN: { heading: 'Services' } },
      },
    ],
  },
  {
    key: 'PROJECTS',
    title: { KA: 'პროექტები', EN: 'Projects' },
    sections: [
      {
        key: 'intro',
        order: 1,
        copy: { KA: { heading: 'პროექტები' }, EN: { heading: 'Projects' } },
      },
    ],
  },
  {
    key: 'TEAM',
    title: { KA: 'გუნდი', EN: 'Team' },
    sections: [
      { key: 'intro', order: 1, copy: { KA: { heading: 'გუნდი' }, EN: { heading: 'Team' } } },
    ],
  },
  {
    key: 'INSIGHTS',
    title: { KA: 'ბლოგი', EN: 'Insights' },
    sections: [
      { key: 'intro', order: 1, copy: { KA: { heading: 'ბლოგი' }, EN: { heading: 'Insights' } } },
    ],
  },
  {
    key: 'CONTACT',
    title: { KA: 'კონტაქტი', EN: 'Contact' },
    sections: [
      {
        key: 'intro',
        order: 1,
        copy: {
          KA: { heading: 'დაიწყე პროექტი', subheading: 'მოგვწერეთ და დაგიკავშირდებით.' },
          EN: { heading: 'Start a Project', subheading: 'Tell us what you need and we will reply.' },
        },
      },
    ],
  },
];

async function seedPages() {
  for (const page of PAGES) {
    const record = await prisma.page.upsert({
      where: { key: page.key },
      update: {},
      create: { key: page.key },
    });

    for (const locale of ['KA', 'EN'] as const) {
      await prisma.pageTranslation.upsert({
        where: { pageId_locale: { pageId: record.id, locale } },
        update: {},
        create: { pageId: record.id, locale, title: page.title[locale] },
      });
    }

    for (const section of page.sections) {
      const sectionRecord = await prisma.pageSection.upsert({
        where: { pageId_key: { pageId: record.id, key: section.key } },
        update: { order: section.order },
        create: { pageId: record.id, key: section.key, order: section.order },
      });

      for (const locale of ['KA', 'EN'] as const) {
        const copy = section.copy[locale];
        await prisma.pageSectionTranslation.upsert({
          where: { sectionId_locale: { sectionId: sectionRecord.id, locale } },
          update: {},
          create: {
            sectionId: sectionRecord.id,
            locale,
            heading: copy.heading,
            subheading: copy.subheading ?? '',
            ctaLabel: copy.ctaLabel ?? '',
            ctaHref: copy.ctaHref ?? '',
          },
        });
      }
    }
  }

  console.warn(`[seed] ${PAGES.length} pages`);
}

// ---------------------------------------------------------------------------
// Insight categories
// ---------------------------------------------------------------------------

const CATEGORIES: Array<{ slug: string; order: number; name: Bilingual<string> }> = [
  { slug: 'industry', order: 1, name: { KA: 'ინდუსტრია', EN: 'Industry' } },
  { slug: 'operations', order: 2, name: { KA: 'ოპერაციები', EN: 'Operations' } },
  { slug: 'menu', order: 3, name: { KA: 'მენიუ', EN: 'Menu' } },
  { slug: 'food-safety', order: 4, name: { KA: 'უსაფრთხოება', EN: 'Food Safety' } },
];

async function seedCategories() {
  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { order: category.order },
      create: { slug: category.slug, order: category.order },
    });

    for (const locale of ['KA', 'EN'] as const) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: record.id, locale } },
        update: {},
        create: { categoryId: record.id, locale, name: category.name[locale] },
      });
    }
  }

  console.warn(`[seed] ${CATEGORIES.length} categories`);
}

// ---------------------------------------------------------------------------
// Social links — created inactive so nothing broken is rendered before the
// real URLs are filled in from the dashboard.
// ---------------------------------------------------------------------------

async function seedSocialLinks() {
  const existing = await prisma.socialLink.count();
  if (existing > 0) {
    console.warn('[seed] social links already present, left untouched');
    return;
  }

  await prisma.socialLink.createMany({
    data: [
      { platform: 'FACEBOOK', url: 'https://facebook.com/', order: 1, isActive: false },
      { platform: 'INSTAGRAM', url: 'https://instagram.com/', order: 2, isActive: false },
      { platform: 'LINKEDIN', url: 'https://linkedin.com/', order: 3, isActive: false },
      { platform: 'YOUTUBE', url: 'https://youtube.com/', order: 4, isActive: false },
    ],
  });

  console.warn('[seed] 4 social link placeholders (inactive)');
}

// ---------------------------------------------------------------------------
// One published example of each content type, so the dashboard and the public
// page are not empty on first run.
// ---------------------------------------------------------------------------

async function seedExampleContent() {
  const project = await prisma.project.upsert({
    where: { slug: 'example-case-study' },
    update: {},
    create: {
      slug: 'example-case-study',
      status: 'PUBLISHED',
      featured: true,
      order: 1,
      year: 2025,
      location: 'Tbilisi, Georgia',
      publishedAt: new Date(),
    },
  });

  const projectCopy: Bilingual<{ title: string; summary: string }> = {
    KA: {
      title: 'მაგალითი: ახალი რესტორნის გაშვება',
      summary:
        'სანიმუშო ქეის-სთადი. ჩაანაცვლეთ ან წაშალეთ ადმინ პანელიდან — ეს ჩანაწერი მხოლოდ იმისთვისაა, რომ საიტი ცარიელი არ იყოს პირველ გაშვებაზე.',
    },
    EN: {
      title: 'Example: launching a new restaurant',
      summary:
        'A placeholder case study. Replace or delete it from the dashboard — it exists only so the site is not empty on first run.',
    },
  };

  for (const locale of ['KA', 'EN'] as const) {
    await prisma.projectTranslation.upsert({
      where: { projectId_locale: { projectId: project.id, locale } },
      update: {},
      create: { projectId: project.id, locale, ...projectCopy[locale] },
    });
  }

  const member = await prisma.teamMember.upsert({
    where: { slug: 'example-team-member' },
    update: {},
    create: { slug: 'example-team-member', status: 'DRAFT', order: 1 },
  });

  const memberCopy: Bilingual<{ name: string; position: string; expertise: string }> = {
    KA: { name: 'სახელი გვარი', position: 'დამფუძნებელი', expertise: 'კულინარიული განვითარება' },
    EN: { name: 'Name Surname', position: 'Founder', expertise: 'Culinary development' },
  };

  for (const locale of ['KA', 'EN'] as const) {
    await prisma.teamMemberTranslation.upsert({
      where: { teamMemberId_locale: { teamMemberId: member.id, locale } },
      update: {},
      create: { teamMemberId: member.id, locale, ...memberCopy[locale] },
    });
  }

  console.warn('[seed] example project + team member');
}

// ---------------------------------------------------------------------------

async function main() {
  console.warn('[seed] starting');

  await seedAdminUser();
  await seedSiteSettings();
  await seedServices();
  await seedPages();
  await seedCategories();
  await seedSocialLinks();
  await seedExampleContent();

  console.warn('[seed] done');
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
