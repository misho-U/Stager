'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { Media } from '@/entity/media/model/media.model';
import { useDeleteMedia, useUpdateMedia } from '@/entity/media/api/media.query';
import { Button } from '@/shared/components/button';
import { ConfirmButton } from '@/shared/components/confirm-button';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState, ErrorNotice, Panel } from '@/shared/components/panel';
import { toFormErrorMessage } from '@/shared/lib/form-errors';
import { useMediaPicker } from '@/widgets/media-picker/media-picker.service';
import { formatBytes } from '@/widgets/media-picker/media-picker.utils';

/**
 * The media library.
 *
 * Reuses the media-picker widget's hook for listing and uploading rather than
 * duplicating that logic — the difference here is editing alt text and
 * deleting, not fetching.
 */
export function AdminMediaModule() {
  const { items, isLoading, loadError, uploadFile, isUploading, uploadError } = useMediaPicker();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  const [editing, setEditing] = useState<Media | null>(null);
  const [altKa, setAltKa] = useState('');
  const [altEn, setAltEn] = useState('');
  const [newAlt, setNewAlt] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

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
      setActionError(toFormErrorMessage(caught));
    }
  };

  const remove = async (id: string) => {
    setActionError(null);
    try {
      await deleteMedia.mutateAsync(id);
      if (editing?.id === id) setEditing(null);
    } catch (caught) {
      // The API refuses to delete an image still used by content, and says so.
      setActionError(toFormErrorMessage(caught));
    }
  };

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image used on the site. Alt text is what a screen reader announces."
      />

      {loadError ? <ErrorNotice message={loadError} /> : null}
      {uploadError ? <ErrorNotice message={uploadError} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <Panel title="Upload">
        <div className="flex flex-col gap-3">
          <label className="text-caption font-medium text-ink-muted">
            Describe the image (alt text)
            <input
              value={newAlt}
              onChange={(event) => setNewAlt(event.target.value)}
              placeholder="e.g. Chef plating a dish during service"
              className="mt-1 w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-body-sm"
            />
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={newAlt.trim().length === 0 || isUploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const created = await uploadFile(file, newAlt.trim());
              if (created) setNewAlt('');
            }}
            className="text-body-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-raised file:px-3 file:py-1.5 file:text-body-sm"
          />
          {newAlt.trim().length === 0 ? (
            <p className="text-caption text-ink-subtle">
              Add alt text before choosing a file — it cannot be filled in properly later.
            </p>
          ) : null}
          {isUploading ? <p className="text-caption text-ink-subtle">Uploading…</p> : null}
        </div>
      </Panel>

      <Panel title={`Library (${items.length})`}>
        {isLoading ? (
          <p className="text-body-sm text-ink-subtle">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState title="No images yet" description="Upload the first one above." />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((media) => (
              <li
                key={media.id}
                className="flex gap-3 rounded-md border border-line bg-brand-cream-light p-3"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-brand-cream-tint">
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
                        placeholder="Alt text (Georgian)"
                        className="w-full rounded-md border border-line bg-surface-raised px-2 py-1 text-caption"
                      />
                      <input
                        value={altEn}
                        onChange={(event) => setAltEn(event.target.value)}
                        placeholder="Alt text (English)"
                        className="w-full rounded-md border border-line bg-surface-raised px-2 py-1 text-caption"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" loading={updateMedia.isPending} onClick={() => void saveAlt()}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-body-sm text-ink">
                        {media.translations.KA.alt || (
                          <span className="text-danger">No alt text</span>
                        )}
                      </p>
                      <p className="truncate text-caption text-ink-subtle">
                        {media.width && media.height
                          ? `${media.width}×${media.height} · `
                          : ''}
                        {formatBytes(media.size)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(media)}>
                          Edit alt text
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Confirm"
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
