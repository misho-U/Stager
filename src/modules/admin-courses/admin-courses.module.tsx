'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import { adminCourseCategoriesQuery } from '@/entity/course-category/api/course-category.query';
import { adminCoursesQuery, useDeleteCourse } from '@/entity/course/api/course.query';
import type { AdminCourse } from '@/entity/course/model/course.model';
import { ButtonLink } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { DataTable, type Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { ErrorNotice, LoadFailed, Panel, StatusBadge } from '@/shared/components/panel';
import { todayInTbilisi } from '@/shared/lib/calendar-date';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';

export function AdminCoursesModule() {
  const t = useTranslations('admin');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const { data, isLoading, error, refetch } = useQuery(adminCoursesQuery());
  // Only while nothing has loaded; a failed refresh keeps the list on screen.
  const loadFailed = error && !data ? formErrors.message(error) : null;
  const categoriesQuery = useQuery(adminCourseCategoriesQuery());
  const deleteCourse = useDeleteCourse();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const today = todayInTbilisi();
  const categoryName = new Map(
    (categoriesQuery.data?.items ?? []).map((category) => [
      category.id,
      category.translations.KA.name || category.translations.EN.name || category.slug,
    ]),
  );

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteCourse.mutateAsync(id);
    } catch (caught) {
      setDeleteError(formErrors.message(caught));
    }
  };

  const columns: Array<Column<AdminCourse>> = [
    {
      key: 'title',
      header: t('courses.columns.course'),
      render: (course) => (
        <Link
          href={`/admin/courses/${course.id}`}
          className="text-ink font-medium underline-offset-4 hover:underline"
        >
          {course.translations.KA.title || course.translations.EN.title || course.slug}
        </Link>
      ),
    },
    {
      key: 'startsAt',
      header: t('courses.columns.startsAt'),
      render: (course) =>
        course.startsAt ? (
          <span className="flex flex-col">
            <span className="text-ink-muted">{format.date(course.startsAt)}</span>
            {/* The site drops a course once its date has passed; said here so
                a course that vanished from the site is not a mystery. */}
            {course.startsAt < today ? (
              <span className="text-caption text-danger">{t('courses.datePassed')}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-ink-subtle">{t('courses.noDate')}</span>
        ),
    },
    {
      key: 'category',
      header: t('courses.columns.category'),
      secondary: true,
      render: (course) => (
        <span className="text-ink-muted">
          {(course.categoryId && categoryName.get(course.categoryId)) || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (course) => <StatusBadge status={course.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (course) => (
        <ConfirmButton
          label={t('common.delete')}
          confirmLabel={t('common.confirm')}
          loading={deleteCourse.isPending && deleteCourse.variables === course.id}
          onConfirm={() => remove(course.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('courses.title')}
        description={t('courses.description')}
        actions={
          <>
            <ButtonLink href="/admin/courses/categories" variant="secondary">
              {t('courses.categoriesLink')}
            </ButtonLink>
            <ButtonLink href="/admin/courses/new">{t('courses.new')}</ButtonLink>
          </>
        }
      />

      {deleteError ? <ErrorNotice message={deleteError} /> : null}

      <Panel>
        {loadFailed ? (
          <LoadFailed message={loadFailed} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : (
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            rowKey={(course) => course.id}
            emptyTitle={t('courses.emptyTitle')}
          />
        )}
      </Panel>
    </>
  );
}
