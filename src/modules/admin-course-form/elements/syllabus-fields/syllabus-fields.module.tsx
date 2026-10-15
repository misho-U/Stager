'use client';

import { useTranslations } from 'next-intl';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';

import {
  MAX_COURSE_MODULES,
  type CourseFormValues,
  type CourseInput,
} from '@/entity/course/model/course.model';
import { Button } from '@/shared/components/button';
import { TranslatedFields } from '@/shared/components/content-locale';
import { TextAreaField, TextField } from '@/shared/components/field';
import { Panel } from '@/shared/components/panel';
import type { DbLocale } from '@/shared/types/enums';

const EMPTY_MODULE_TRANSLATION = { title: '', duration: '', description: '' };

/**
 * A course's syllabus: an ordered list of modules, each titled in both
 * languages, with an optional "when or how long" and description. The site
 * offers "See syllabus" on a course only while this list has something in it.
 *
 * Reordered with arrows rather than drag-and-drop, like the gallery picker:
 * arrows work by keyboard and on a phone. The whole list is saved with the
 * course and replaces the one before.
 */
export function SyllabusFields({
  form,
}: {
  form: UseFormReturn<CourseFormValues, unknown, CourseInput>;
}) {
  const t = useTranslations('admin');
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'syllabus',
  });
  const errors = form.formState.errors.syllabus;
  const full = fields.length >= MAX_COURSE_MODULES;

  return (
    <Panel title={t('courses.form.syllabusPanel')} description={t('courses.form.syllabus.intro')}>
      <div className="flex flex-col gap-4" data-testid="syllabus-fields">
        {fields.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{t('courses.form.syllabus.empty')}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {fields.map((field, index) => {
              const number = index + 1;
              return (
                <li
                  key={field.id}
                  className="border-line bg-surface flex flex-col gap-4 rounded-md border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-body text-ink font-semibold">
                      {t('courses.form.syllabus.module', { number })}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('courses.form.syllabus.moveUp', { number })}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('courses.form.syllabus.moveDown', { number })}
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('courses.form.syllabus.remove', { number })}
                        onClick={() => remove(index)}
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                  </div>
                  <TranslatedFields>
                    {(locale: DbLocale) => {
                      const fieldErrors = errors?.[index]?.translations?.[locale];
                      return (
                        <>
                          <TextField
                            label={t('courses.form.syllabus.title')}
                            required
                            error={fieldErrors?.title?.message}
                            {...form.register(`syllabus.${index}.translations.${locale}.title`)}
                          />
                          <TextField
                            label={t('courses.form.syllabus.duration.label')}
                            hint={t('courses.form.syllabus.duration.hint')}
                            error={fieldErrors?.duration?.message}
                            {...form.register(`syllabus.${index}.translations.${locale}.duration`)}
                          />
                          <TextAreaField
                            label={t('courses.form.syllabus.description.label')}
                            hint={t('courses.form.syllabus.description.hint')}
                            rows={3}
                            error={fieldErrors?.description?.message}
                            {...form.register(
                              `syllabus.${index}.translations.${locale}.description`,
                            )}
                          />
                        </>
                      );
                    }}
                  </TranslatedFields>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={full}
            onClick={() =>
              append({
                translations: {
                  KA: { ...EMPTY_MODULE_TRANSLATION },
                  EN: { ...EMPTY_MODULE_TRANSLATION },
                },
              })
            }
          >
            {t('courses.form.syllabus.add')}
          </Button>
          {full ? (
            <p className="text-body-sm text-ink-muted">
              {t('courses.form.syllabus.limit', { max: MAX_COURSE_MODULES })}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
