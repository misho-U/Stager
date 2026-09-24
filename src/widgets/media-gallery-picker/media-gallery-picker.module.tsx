'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { useMediaPicker } from '@/widgets/media-picker/media-picker.service';

type MediaGalleryPickerProps = {
  label: string;
  /** Ordered media ids. Order is the display order on the public page. */
  value: string[];
  onChange: (mediaIds: string[]) => void;
};

/**
 * Ordered multi-select over the media library.
 *
 * Reordering is explicit arrows rather than drag-and-drop: drag needs a
 * dependency, breaks on touch without extra work, and is unusable with a
 * keyboard. Arrows work everywhere and are obvious.
 */
export function MediaGalleryPicker({ label, value, onChange }: MediaGalleryPickerProps) {
  const { items, isLoading } = useMediaPicker();
  const [isOpen, setIsOpen] = useState(false);

  const selected = value
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;

    const next = [...value];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(target, 0, moved);
    onChange(next);
  };

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium text-ink-muted">{label}</span>
        <Button variant="secondary" size="sm" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? 'Done' : 'Add images'}
        </Button>
      </div>

      {selected.length === 0 ? (
        <p className="text-caption text-ink-subtle">No gallery images selected.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {selected.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-line bg-surface-raised p-2"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-sm">
                <Image
                  src={item.url}
                  alt={item.translations.KA.alt || item.translations.EN.alt || ''}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <span className="min-w-0 flex-1 truncate text-caption text-ink-muted">
                {item.translations.KA.alt || item.translations.EN.alt || item.pathname}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Move down"
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggle(item.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen ? (
        <div className="rounded-md border border-line bg-surface-inset p-3">
          {isLoading ? (
            <p className="text-body-sm text-ink-subtle">Loading library…</p>
          ) : items.length === 0 ? (
            <p className="text-body-sm text-ink-subtle">
              No images yet. Upload one from the cover image field or the Media screen.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'relative block aspect-square w-full overflow-hidden rounded-md border transition-colors',
                      value.includes(item.id)
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
