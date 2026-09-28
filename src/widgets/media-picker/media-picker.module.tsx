'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { Button } from '@/shared/components/button';
import { ErrorNotice } from '@/shared/components/panel';
import { cn } from '@/shared/lib/cn';
import { useMediaPicker } from '@/widgets/media-picker/media-picker.service';
import { ALLOWED_IMAGE_TYPES } from '@pkg/blob/constraints';

type MediaPickerProps = {
  label: string;
  /** Currently selected media id, or null. */
  value: string | null;
  onChange: (mediaId: string | null) => void;
  hint?: string;
};

/**
 * Pick an existing image or upload a new one.
 *
 * Uploading requires alt text before the file dialog opens rather than after:
 * asked afterwards it gets skipped, and an image library full of empty alt
 * attributes is impossible to fix later.
 */
export function MediaPicker({ label, value, onChange, hint }: MediaPickerProps) {
  const t = useTranslations('admin');
  const { items, isLoading, loadError, uploadFile, isUploading, uploadProgress, uploadError } =
    useMediaPicker();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selected = items.find((item) => item.id === value) ?? null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const created = await uploadFile(file, altText.trim());
    if (created) {
      onChange(created.id);
      setAltText('');
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-ink-muted">{label}</span>

      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
          {selected ? (
            <Image
              src={selected.url}
              alt={selected.translations.KA.alt || selected.translations.EN.alt || ''}
              fill
              sizes="64px"
              className="object-cover"
              {...(selected.blurDataUrl
                ? { placeholder: 'blur' as const, blurDataURL: selected.blurDataUrl }
                : {})}
            />
          ) : (
            <span className="flex h-full items-center justify-center px-1 text-center text-caption text-ink-subtle">
              {t('mediaPicker.none')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsOpen((open) => !open)}>
            {isOpen
              ? t('common.close')
              : selected
                ? t('mediaPicker.change')
                : t('mediaPicker.choose')}
          </Button>
          {selected ? (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              {t('common.remove')}
            </Button>
          ) : null}
        </div>
      </div>

      {hint ? <p className="text-caption text-ink-subtle">{hint}</p> : null}

      {isOpen ? (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-inset p-3">
          {loadError ? <ErrorNotice message={loadError} /> : null}
          {uploadError ? <ErrorNotice message={uploadError} /> : null}

          <div className="flex flex-col gap-2 border-b border-line pb-3">
            <label className="text-caption font-medium text-ink-muted">
              {t('alt.label')}
              <input
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder={t('mediaPicker.altPlaceholder')}
                className="mt-1 w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-body-sm"
              />
            </label>
            <p className="text-caption text-ink-subtle">{t('alt.hint')}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={isUploading}
                disabled={altText.trim().length === 0}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading
                  ? t('media.uploading', { progress: uploadProgress ?? 0 })
                  : t('mediaPicker.upload')}
              </Button>
              {altText.trim().length === 0 ? (
                <span className="text-caption text-ink-subtle">{t('mediaPicker.altRequired')}</span>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                // Reset so selecting the same file twice re-fires onChange.
                event.target.value = '';
              }}
            />
          </div>

          {isLoading ? (
            <p className="text-body-sm text-ink-subtle">{t('mediaPicker.loadingLibrary')}</p>
          ) : items.length === 0 ? (
            <p className="text-body-sm text-ink-subtle">{t('mediaPicker.empty')}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'relative block aspect-square w-full overflow-hidden rounded-md border transition-colors',
                      item.id === value
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    <Image
                      src={item.url}
                      alt={item.translations.KA.alt || item.translations.EN.alt || ''}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
