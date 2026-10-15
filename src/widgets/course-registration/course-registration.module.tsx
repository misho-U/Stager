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
 * A course's "See syllabus": opens the same drawer on the course's syllabus,
 * with Register at its foot. Render it only for a course that has one.
 */
export function SyllabusButton({ course, className, children }: RegisterButtonProps) {
  const open = useRegistrationStore((state) => state.open);
  return (
    <button
      type="button"
      data-syllabus={course.id}
      aria-haspopup="dialog"
      onClick={() => open(course, 'syllabus')}
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
 * Opened from "See syllabus", it first shows what the course covers, and
 * its Register button turns the same drawer into the form.
 *
 * One per page, styled by the design's tokens. It slides in from the right
 * on a wide screen and rises from the bottom on a phone (CSS only, so reduced
 * motion makes it appear at once).
 */
export function RegistrationDialog({
  locale,
  privacyHref = null,
  registerClassName,
}: {
  locale: DbLocale;
  /** The privacy policy, once it has text (see InquiryForm). */
  privacyHref?: string | null;
  /** The design's primary button, for Register under a syllabus. */
  registerClassName?: string;
}) {
  const t = useTranslations('academy');
  const { course, view, dialog, onClose, register, requestClose } = useRegistrationDialog();
  const showSyllabus = view === 'syllabus' && course !== null && course.syllabus.length > 0;

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
                {showSyllabus
                  ? t('syllabusTitle')
                  : course.full
                    ? t('waitlistTitle')
                    : t('registerTitle')}
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
          {showSyllabus ? (
            <SyllabusView
              course={course}
              registerLabel={course.full ? t('waitlist') : t('register')}
              registerClassName={registerClassName}
              onRegister={register}
            />
          ) : (
            <>
              <p className="text-body text-ink-muted text-pretty">{t('registerHint')}</p>
              {/* Keyed by course: choosing another one starts a fresh form. */}
              <InquiryForm
                key={course.id}
                locale={locale}
                privacyHref={privacyHref}
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
            </>
          )}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * The syllabus inside the drawer: the course's details, then each module in
 * order with its "when or how long" and what it covers, then Register. The
 * steps are an ordered list, so a screen reader announces "1 of 6".
 */
function SyllabusView({
  course,
  registerLabel,
  registerClassName,
  onRegister,
}: {
  course: RegistrationCourse;
  registerLabel: string;
  registerClassName?: string;
  onRegister: () => void;
}) {
  const t = useTranslations('academy');

  return (
    <div className="flex flex-1 flex-col gap-8" data-testid="syllabus">
      <p className="text-body-sm text-ink-muted">
        {[...course.details, t('syllabusCount', { count: course.syllabus.length })].join(' · ')}
      </p>
      <ol className="flex flex-col">
        {course.syllabus.map((step, index) => (
          <li
            key={index}
            className="border-line flex gap-5 border-t py-5 first:border-t-0 first:pt-0"
          >
            <span
              aria-hidden
              className="text-title-sm font-heading text-accent w-8 shrink-0 tabular-nums"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-body-lg font-heading text-balance">{step.title}</h3>
                {step.duration ? (
                  <p className="text-body-sm text-ink-muted shrink-0">{step.duration}</p>
                ) : null}
              </div>
              {step.description ? (
                <p className="text-body-sm text-ink-muted text-pretty whitespace-pre-line">
                  {step.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="bg-surface sticky bottom-0 -mx-6 mt-auto px-6 py-4 sm:-mx-10 sm:px-10">
        <button type="button" onClick={onRegister} className={registerClassName}>
          {registerLabel}
        </button>
      </div>
    </div>
  );
}
