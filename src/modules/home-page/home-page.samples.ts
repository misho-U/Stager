import type { PublicCourse } from '@/entity/course/model/course.model';
import type { PublicVideo } from '@/entity/video/model/video.model';
import type { DbLocale } from '@/shared/types/enums';

/**
 * TEMPORARY: sample Academy courses and videos for the round-4 design
 * comparison.
 *
 * The dashboard cannot hold courses or videos yet, and both designs need some
 * to be judged. These entries are invented, so every section that shows them
 * says so on the page ("Sample"). They go the moment the dashboard supplies
 * real ones; never ship them to production as content.
 *
 * Dates are counted from today, so the timetable never shows a course that
 * has already started. No video has a link: a sample cannot point at a real
 * film of someone else's kitchen, so its player explains that instead.
 */

type Localised<T> = Record<DbLocale, T>;

type CourseText = Pick<PublicCourse, 'title' | 'summary' | 'duration' | 'location'>;
type VideoText = Pick<PublicVideo, 'title' | 'summary'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `days` from today at 10:00 in Tbilisi (06:00 UTC). Negative for the past. */
function fromToday(days: number): string {
  const date = new Date();
  date.setUTCHours(6, 0, 0, 0);
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

const COURSES: ReadonlyArray<
  Omit<PublicCourse, keyof CourseText | 'startsAt' | 'cover'> & {
    inDays: number;
    text: Localised<CourseText>;
  }
> = [
  {
    id: 'sample-course-haccp',
    slug: 'haccp-for-kitchen-teams',
    category: 'food-safety',
    format: 'in-person',
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
    format: 'in-person',
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
    format: 'in-person',
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
    format: 'online',
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
    format: 'in-person',
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
    format: 'in-person',
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
    kind: 'episode',
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
    kind: 'podcast',
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
    kind: 'masterclass',
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
    kind: 'episode',
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
    kind: 'podcast',
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

export function sampleCourses(locale: DbLocale): PublicCourse[] {
  // Soonest first, as the API will list them.
  return [...COURSES]
    .sort((a, b) => a.inDays - b.inDays)
    .map(({ inDays, text, ...course }) => ({
    ...course,
      ...text[locale],
      startsAt: fromToday(inDays),
      cover: null,
    }));
}

export function sampleVideos(locale: DbLocale): PublicVideo[] {
  return VIDEOS.map(({ daysAgo, text, ...video }) => ({
    ...video,
    ...text[locale],
    publishedAt: fromToday(-daysAgo),
    youtubeUrl: null,
  }));
}
