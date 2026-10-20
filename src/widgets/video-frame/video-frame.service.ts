'use client';

import { useEffect, useRef, useState } from 'react';

import { useMediaPicker } from '@/widgets/media-picker/media-picker.service';

/** Longest edge of the captured frame: a full-width card on a 2× screen. */
const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.9;

/** The frame on screen, as a JPEG no larger than MAX_EDGE on its longest side. */
export function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('No 2D canvas'));
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Throws (SecurityError) when the video came from a host that does not
  // allow its pictures to be read: the caller offers the local file instead.
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Empty frame'))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

export type FrameError = 'unreadable' | 'notReady' | null;

/**
 * Takes a video's cover from one of its own frames: the owner pauses the
 * film on the moment they want, and that picture is uploaded to the media
 * library like any image and becomes the cover.
 *
 * The stored file is tried first. A browser may refuse to hand over its
 * pictures if the file's host does not allow it (the canvas is "tainted");
 * then the same file is opened from the owner's computer, which is always
 * readable and costs no upload.
 */
export function useVideoFrame(storedUrl: string | null, alt: string) {
  const { uploadFile, isUploading, uploadProgress, uploadError } = useMediaPicker();
  const video = useRef<HTMLVideoElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [error, setError] = useState<FrameError>(null);

  // A local file's address holds the file in memory until it is let go.
  useEffect(() => () => (localUrl ? URL.revokeObjectURL(localUrl) : undefined), [localUrl]);

  const openLocal = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLocalUrl(URL.createObjectURL(file));
  };

  /** The frame on screen becomes the cover; the new image's id, or null. */
  const takeFrame = async (): Promise<string | null> => {
    const element = video.current;
    setError(null);
    if (!element || element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError('notReady');
      return null;
    }
    let frame: Blob;
    try {
      frame = await captureFrame(element);
    } catch {
      setError('unreadable');
      return null;
    }
    const file = new File([frame], 'video-cover.jpg', { type: 'image/jpeg' });
    const created = await uploadFile(file, alt);
    return created?.id ?? null;
  };

  return {
    video,
    src: localUrl ?? storedUrl,
    isLocal: localUrl !== null,
    openLocal,
    takeFrame,
    /** The stored file failed to load as a readable video. */
    onLoadError: () => setError('unreadable'),
    error,
    isUploading,
    uploadProgress,
    uploadError,
  };
}
