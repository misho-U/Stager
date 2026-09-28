'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';

import type { Media } from '@/entity/media/model/media.model';
import { useDeleteMedia, useUpdateMedia } from '@/entity/media/api/media.query';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState, ErrorNotice, Panel } from '@/shared/components/panel';
import { useFormErrors } from '@/shared/lib/form-errors';
import { useAdminFormat } from '@/shared/lib/use-admin-format';
import { useMediaPicker } from '@/widgets/media-picker/media-picker.service';

/**
 * The media library.
 *
 * Reuses the media-picker widget's hook for listing and uploading rather than
 * duplicating that logic — the difference here is editing alt text and
 * deleting, not fetching.
 */
export function AdminMediaModule() {
  const t = useTranslations('admin');
  const format = useAdminFormat();
  const formErrors = useFormErrors();
  const { items, isLoading, loadError, uploadFile, isUploading, uploadProgress, uploadError } =
    useMediaPicker();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  const [editing, setEditing] = useState<Media | null>(null);
  const [altKa, setAltKa] = useState('');
  const [altEn, setAltEn] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canUpload = newAlt.trim().length > 0 && !isUploading;

  const startEdit = (media: Media) => {
    setEditing(media);
    setAltKa(media.translations.KA.alt);
    setAltEn(media.translations.EN.alt);
    setActionError(null);
  };

  const saveAlt = async () => {
    if (!editing) return;
    setActionError(null);
    try {
      await updateMedia.mutateAsync({
        id: editing.id,
        input: {
          translations: {
            KA: { alt: altKa, caption: editing.translations.KA.caption },
            EN: { alt: altEn, caption: editing.translations.EN.caption },
          },
        },
      });
      setEditing(null);
    } catch (caught) {
      setActionError(formErrors.message(caught));
    }
  };

  const remove = async (id: string) => {
    setActionError(null);
    try {
      await deleteMedia.mutateAsync(id);
      if (editing?.id === id) setEditing(null);
    } catch (caught) {
      // The API refuses to delete an image still used by content, and says so.
      setActionError(formErrors.message(caught));
    }
  };

  return (
    <>
      <PageHeader
        title={t('media.title')}
        description={t('media.description')}
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {uploadError ? <ErrorNotice message={uploadError} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <Panel title={t('media.upload')}>
        <div className="flex flex-col gap-3">
          <label className="text-caption font-medium text-ink-muted">
            {t('alt.label')}
            <input
              value={newAlt}
              onChange={(event) => setNewAlt(event.target.value)}
              placeholder={t('media.altPlaceholder')}
              className="mt-1 w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-body-sm"
            />
          </label>
          <p className="text-caption text-ink-subtle">{t('alt.hint')}</p>
          {/* A button in front of a hidden file input: the browser's own control
              says "Choose File" in the browser's language, whatever the
              dashboard is in. */}
          <div>
            <Button
              variant="secondary"
              disabled={!canUpload}
              loading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('mediaPicker.upload')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={!canUpload}
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                const created = await uploadFile(file, newAlt.trim());
                if (created) setNewAlt('');
              }}
            />
          </div>
          {newAlt.trim().length === 0 ? (
            <p className="text-caption text-ink-subtle">{t('media.altFirst')}</p>
          ) : null}
          {isUploading ? (
            <p className="text-caption text-ink-subtle" role="status">
              {t('media.uploading', { progress: uploadProgress ?? 0 })}
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel title={t('media.library', { count: items.length })}>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <EmptyState title={t('media.emptyTitle')} description={t('media.emptyDescription')} />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((media) => (
              <li
                key={media.id}
                className="flex gap-3 rounded-md border border-line bg-surface-inset p-3"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                  <Image
                    src={media.url}
                    alt={media.translations.KA.alt || media.translations.EN.alt || ''}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {editing?.id === media.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={altKa}
                        onChange={(event) => setAltKa(event.target.value)}
                        placeholder={t('media.altKa')}
                        aria-label={t('media.altKa')}
                        className="w-full rounded-md border border-line bg-surface-raised px-2 py-1 text-caption"
                      />
                      <input
                        value={altEn}
                        onChange={(event) => setAltEn(event.target.value)}
                        placeholder={t('media.altEn')}
                        aria-label={t('media.altEn')}
                        className="w-full rounded-md border border-line bg-surface-raised px-2 py-1 text-caption"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" loading={updateMedia.isPending} onClick={() => void saveAlt()}>
                          {t('common.save')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-body-sm text-ink">
                        {media.translations.KA.alt || (
                          <span className="text-danger">{t('media.noAlt')}</span>
                        )}
                      </p>
                      <p className="truncate text-caption text-ink-subtle">
                        {media.width && media.height
                          ? `${media.width}×${media.height} · `
                          : ''}
                        {format.fileSize(media.size)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(media)}>
                          {t('media.editAlt')}
                        </Button>
                        <ConfirmButton
                          label={t('common.delete')}
                          confirmLabel={t('common.confirm')}
                          loading={deleteMedia.isPending && deleteMedia.variables === media.id}
                          onConfirm={() => remove(media.id)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
