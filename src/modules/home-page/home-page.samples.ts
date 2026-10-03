import type { PublicCourse } from '@/entity/course/model/course.model';
import type { PublicService } from '@/entity/service/model/service.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import { todayInTbilisi } from '@/shared/lib/calendar-date';
import type { DbLocale } from '@/shared/types/enums';

/**
 * TEMPORARY: sample Academy courses and videos for the design comparison.
 *
 * Both designs need some to be judged before the dashboard holds real ones.
 * These entries are invented, so every section that shows them says so on the
 * page ("Sample"), and the first real entry in the dashboard replaces them
 * (`orSamples`, home-page.service.ts). Never ship them to production as content.
 *
 * Dates are counted from today, so the timetable never shows a course that
 * has already started. No video has a link: a sample cannot point at a real
 * film of someone else's kitchen, so its player explains that instead.
 */

type Localised<T> = Record<DbLocale, T>;

type CourseText = Pick<PublicCourse, 'title' | 'summary' | 'duration' | 'location'>;
type VideoText = Pick<PublicVideo, 'title' | 'summary'>;

/** The Academy's sample filters; real ones are the course categories in the dashboard. */
type SampleCategory = 'kitchen' | 'management' | 'food-safety' | 'hospitality';

const CATEGORY_NAMES: Localised<Record<SampleCategory, string>> = {
  EN: {
    kitchen: 'Kitchen',
    management: 'Management',
    'food-safety': 'Food safety',
    hospitality: 'Hospitality',
  },
  KA: {
    kitchen: 'სამზარეულო',
    management: 'მენეჯმენტი',
    'food-safety': 'სურსათის უვნებლობა',
    hospitality: 'სტუმარმასპინძლობა',
  },
};

/**
 * Which sample subject teaches what a service does, by the service's icon key
 * (the one stable key a service has besides its slug). A real course names its
 * service in the dashboard instead.
 */
const CATEGORY_BY_SERVICE_ICON: Partial<Record<string, SampleCategory>> = {
  concept: 'management',
  menu: 'management',
  kitchen: 'kitchen',
  training: 'hospitality',
  haccp: 'food-safety',
};

/** A section's entries, and whether they are invented ones shown in their place. */
export type SectionItems<T> = { items: T[]; sample: boolean };

/**
 * The Academy and the videos show samples, marked "Sample" on the page, while
 * the dashboard holds none of their own; the first real entry replaces them
 * all. A FAILED read shows nothing instead: invented entries standing in for
 * content that did not load would hide the outage.
 */
export function orSamples<T>(
  read: { data: { items: T[] }; failed: boolean },
  samples: () => T[],
): SectionItems<T> {
  if (read.failed || read.data.items.length > 0) return { items: read.data.items, sample: false };
  return { items: samples(), sample: true };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar day `days` from today in Tbilisi ("2026-11-15"), negative for the past. */
function dayFromToday(days: number): string {
  return todayInTbilisi(new Date(Date.now() + days * DAY_MS));
}

const COURSES: ReadonlyArray<
  Omit<PublicCourse, keyof CourseText | 'startsAt' | 'cover' | 'category' | 'serviceId'> & {
    category: SampleCategory;
    inDays: number;
    text: Localised<CourseText>;
  }
> = [
  {
    id: 'sample-course-haccp',
    slug: 'haccp-for-kitchen-teams',
    category: 'food-safety',
    format: 'IN_PERSON',
    inDays: 9,
    seatsTotal: 16,
    seatsLeft: 4,
    priceGel: 350,
    text: {
      EN: {
        title: 'HACCP for kitchen teams',
        summary:
          'Hazards, critical control points and the daily records an inspection asks for, practised on real cases from working kitchens.',
        duration: '2 days',
        location: 'Tbilisi',
      },
      KA: {
        title: 'HACCP სამზარეულოს გუნდისთვის',
        summary:
          'საფრთხეები, კრიტიკული საკონტროლო წერტილები და ყოველდღიური ჩანაწერები, რასაც ინსპექცია ითხოვს, მოქმედი სამზარეულოების რეალურ მაგალითებზე.',
        duration: '2 დღე',
        location: 'თბილისი',
      },
    },
  },
  {
    id: 'sample-course-menu',
    slug: 'menu-engineering-and-food-cost',
    category: 'management',
    format: 'IN_PERSON',
    inDays: 29,
    seatsTotal: 14,
    seatsLeft: 9,
    priceGel: 420,
    text: {
      EN: {
        title: 'Menu engineering and food cost',
        summary:
          'The price, cost and popularity of every dish on one page, and which changes pay off first.',
        duration: '3 evenings',
        location: 'Tbilisi',
      },
      KA: {
        title: 'მენიუს ინჟინერია და თვითღირებულება',
        summary:
          'ყოველი კერძის ფასი, თვითღირებულება და პოპულარობა ერთ გვერდზე და რომელი ცვლილება ამართლებს პირველ რიგში.',
        duration: '3 საღამო',
        location: 'თბილისი',
      },
    },
  },
  {
    id: 'sample-course-leadership',
    slug: 'kitchen-leadership-for-head-chefs',
    category: 'kitchen',
    format: 'IN_PERSON',
    inDays: 20,
    seatsTotal: 12,
    seatsLeft: 3,
    priceGel: 890,
    text: {
      EN: {
        title: 'Kitchen leadership for head chefs',
        summary:
          'Running a brigade: prep lists, standards, rotas and the conversations that keep a team together.',
        duration: '4 weeks',
        location: 'Tbilisi',
      },
      KA: {
        title: 'სამზარეულოს ლიდერობა შეფებისთვის',
        summary:
          'ბრიგადის მართვა: მომზადების სიები, სტანდარტები, გრაფიკები და საუბრები, რომლებიც გუნდს ერთად ინარჩუნებს.',
        duration: '4 კვირა',
        location: 'თბილისი',
      },
    },
  },
  {
    id: 'sample-course-opening',
    slug: 'opening-a-restaurant-step-by-step',
    category: 'management',
    format: 'ONLINE',
    inDays: 12,
    seatsTotal: 40,
    seatsLeft: 22,
    priceGel: 180,
    text: {
      EN: {
        title: 'Opening a restaurant, step by step',
        summary:
          'From the concept and the budget to the first service: what to decide, and in which order.',
        duration: '1 day',
        location: null,
      },
      KA: {
        title: 'რესტორნის გახსნა, ნაბიჯ-ნაბიჯ',
        summary:
          'კონცეფციიდან და ბიუჯეტიდან პირველ სერვისამდე: რა უნდა გადაწყდეს და რა თანმიმდევრობით.',
        duration: '1 დღე',
        location: null,
      },
    },
  },
  {
    id: 'sample-course-service',
    slug: 'service-standards-for-front-of-house',
    category: 'hospitality',
    format: 'IN_PERSON',
    inDays: 41,
    seatsTotal: 18,
    seatsLeft: 11,
    priceGel: 300,
    text: {
      EN: {
        title: 'Service standards for front-of-house teams',
        summary:
          'Welcome, timing and recovering from a mistake: one standard the whole floor can keep.',
        duration: '2 days',
        location: 'Batumi',
      },
      KA: {
        title: 'მომსახურების სტანდარტები დარბაზის გუნდისთვის',
        summary:
          'მისალმება, დროის მართვა და შეცდომის გამოსწორება: ერთი სტანდარტი, რომელსაც მთელი დარბაზი დაიცავს.',
        duration: '2 დღე',
        location: 'ბათუმი',
      },
    },
  },
  {
    id: 'sample-course-pastry',
    slug: 'pastry-fundamentals',
    category: 'kitchen',
    format: 'IN_PERSON',
    inDays: 54,
    seatsTotal: 10,
    seatsLeft: 0,
    priceGel: 760,
    text: {
      EN: {
        title: 'Pastry fundamentals',
        summary: 'Doughs, creams and plated desserts, with the ratios that make them repeatable.',
        duration: '6 weeks',
        location: 'Tbilisi',
      },
      KA: {
        title: 'საკონდიტრო საფუძვლები',
        summary:
          'ცომი, კრემები და დესერტის მიწოდება, პროპორციებით, რომლებიც შედეგს განმეორებადს ხდის.',
        duration: '6 კვირა',
        location: 'თბილისი',
      },
    },
  },
];

const VIDEOS: ReadonlyArray<
  Omit<PublicVideo, keyof VideoText | 'publishedAt' | 'youtubeUrl'> & {
    daysAgo: number;
    text: Localised<VideoText>;
  }
> = [
  {
    id: 'sample-video-kitchen-plan',
    slug: 'planning-a-kitchen',
    kind: 'EPISODE',
    daysAgo: 6,
    durationMinutes: 14,
    text: {
      EN: {
        title: 'How we plan a kitchen before the first wall goes up',
        summary:
          'Goods, people and heat moving through a 60-seat restaurant, drawn before anything is built.',
      },
      KA: {
        title: 'როგორ ვგეგმავთ სამზარეულოს, სანამ პირველი კედელი აშენდება',
        summary:
          'საქონლის, ადამიანების და სითბოს მოძრაობა 60-ადგილიან რესტორანში, დახატული მშენებლობის დაწყებამდე.',
      },
    },
  },
  {
    id: 'sample-video-food-cost',
    slug: 'food-cost',
    kind: 'PODCAST',
    daysAgo: 20,
    durationMinutes: 48,
    text: {
      EN: {
        title: 'Food cost: where restaurants lose money',
        summary: 'Waste, portioning and purchasing, with the numbers that show where it goes.',
      },
      KA: {
        title: 'თვითღირებულება: სად კარგავენ რესტორნები ფულს',
        summary: 'ნარჩენები, პორციები და შესყიდვები, ციფრებით, რომლებიც აჩვენებს, სად იკარგება.',
      },
    },
  },
  {
    id: 'sample-video-sauces',
    slug: 'five-sauces',
    kind: 'MASTERCLASS',
    daysAgo: 34,
    durationMinutes: 21,
    text: {
      EN: {
        title: 'Five sauces every line cook should own',
        summary: 'Technique, holding them through a service, and the mistakes that split them.',
      },
      KA: {
        title: 'ხუთი სოუსი, რომელიც ყველა მზარეულმა უნდა იცოდეს',
        summary: 'ტექნიკა, შენახვა სერვისის განმავლობაში და შეცდომები, რომლებიც მათ აფუჭებს.',
      },
    },
  },
  {
    id: 'sample-video-cafe',
    slug: 'opening-a-cafe',
    kind: 'EPISODE',
    daysAgo: 48,
    durationMinutes: 9,
    text: {
      EN: {
        title: 'Five mistakes when opening a cafe',
        summary: 'What we see most often in the first six months, and how to avoid it.',
      },
      KA: {
        title: 'ხუთი შეცდომა კაფის გახსნისას',
        summary: 'რას ვხედავთ ყველაზე ხშირად პირველ ექვს თვეში და როგორ ავიცილოთ თავიდან.',
      },
    },
  },
  {
    id: 'sample-video-hotel',
    slug: 'hotel-food-and-beverage',
    kind: 'PODCAST',
    daysAgo: 75,
    durationMinutes: 56,
    text: {
      EN: {
        title: 'In conversation with a hotel food and beverage director',
        summary:
          'Breakfast for four hundred, banquets, and a restaurant that has to stand on its own.',
      },
      KA: {
        title: 'საუბარი სასტუმროს კვების დირექტორთან',
        summary:
          'საუზმე ოთხასი სტუმრისთვის, ბანკეტები და რესტორანი, რომელიც დამოუკიდებლად უნდა იდგეს.',
      },
    },
  },
];

export function sampleCourses(
  locale: DbLocale,
  services: ReadonlyArray<Pick<PublicService, 'id' | 'icon'>>,
): PublicCourse[] {
  // Soonest first, as the API lists them.
  const courses = [...COURSES].sort((a, b) => a.inDays - b.inDays);

  // Each service points at the next sample course on its subject. Two services
  // on one subject take different courses; one left without names none.
  const serviceByCourse = new Map<string, string>();
  for (const service of services) {
    const subject = service.icon ? CATEGORY_BY_SERVICE_ICON[service.icon] : undefined;
    const course = courses.find(
      (item) => item.category === subject && !serviceByCourse.has(item.id),
    );
    if (course) serviceByCourse.set(course.id, service.id);
  }

  return courses.map(({ inDays, text, category, ...course }) => ({
    ...course,
    ...text[locale],
    category: { slug: category, name: CATEGORY_NAMES[locale][category] },
    serviceId: serviceByCourse.get(course.id) ?? null,
    startsAt: dayFromToday(inDays),
    cover: null,
  }));
}

export function sampleVideos(locale: DbLocale): PublicVideo[] {
  return VIDEOS.map(({ daysAgo, text, ...video }) => ({
    ...video,
    ...text[locale],
    publishedAt: dayFromToday(-daysAgo),
    youtubeUrl: null,
  }));
}
