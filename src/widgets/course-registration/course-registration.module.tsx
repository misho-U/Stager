'use client';

import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { DbLocale } from '@/shared/types/enums';
import {
  useRegistrationDialog,
  useRegistrationStore,
  type RegistrationCourse,
} from '@/widgets/course-registration/course-registration.service';
import { InquiryForm } from '@/widgets/inquiry-form/inquiry-form.module';

type RegisterButtonProps = {
  course: RegistrationCourse;
  /** The design's button styling; the label comes from the course's state. */
  className?: string;
  children: ReactNode;
};

/** A course's "Register" (or "Waitlist"): opens the page's registration drawer for it. */
export function RegisterButton({ course, className, children }: RegisterButtonProps) {
  const open = useRegistrationStore((state) => state.open);
  return (
    <button
      type="button"
      data-register={course.id}
      aria-haspopup="dialog"
      onClick={() => open(course)}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * The registration drawer: the site's own inquiry form, opened from a course
 * already set to Training with a message naming the course and its date. It
 * is the same submission as "Start a Project" (it lands in the dashboard's
 * inquiries), so there is no second pipeline to keep working.
 *
 * One per page, styled by the design's tokens. It slides in from the right
 * on a wide screen and rises from the bottom on a phone (CSS only, so reduced
 * motion makes it appear at once).
 */
export function RegistrationDialog({ locale }: { locale: DbLocale }) {
  const t = useTranslations('academy');
  const { course, dialog, onClose, requestClose } = useRegistrationDialog();

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A click on the dimmed page around the drawer closes it, like Escape.
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      aria-labelledby="registration-title"
      data-registration-dialog
      data-lenis-prevent
      className="registration-dialog bg-surface text-ink"
    >
      {course ? (
        <div className="flex min-h-full flex-col gap-8 p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-body-sm text-ink-muted">
                {course.full ? t('waitlistTitle') : t('registerTitle')}
              </p>
              <h2 id="registration-title" className="text-title font-heading text-balance">
                {course.title}
              </h2>
              <p className="text-body text-ink-muted">
                {course.date ? t('starts', { date: course.date }) : t('dateTba')}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t('close')}
              className="border-line-input hover:bg-surface-muted inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors"
            >
              <XIcon aria-hidden weight="bold" />
            </button>
          </div>
          <p className="text-body text-ink-muted text-pretty">{t('registerHint')}</p>
          {/* Keyed by course: choosing another one starts a fresh form. */}
          <InquiryForm
            key={course.id}
            locale={locale}
            submitLabel={course.full ? t('waitlist') : t('register')}
            defaults={{
              interest: 'TRAINING',
              message: course.date
                ? t(course.full ? 'waitlistMessage' : 'registerMessage', {
                    course: course.title,
                    date: course.date,
                  })
                : t(course.full ? 'waitlistMessageUndated' : 'registerMessageUndated', {
                    course: course.title,
                  }),
            }}
          />
        </div>
      ) : null}
    </dialog>
  );
}
