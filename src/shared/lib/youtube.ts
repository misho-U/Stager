/**
 * YouTube links, the only video source the site supports (`youtubeUrlSchema`
 * in shared/types/api.ts accepts the same hosts).
 *
 * Playback always goes through youtube-nocookie.com, and thumbnails come from
 * i.ytimg.com: the CSP and next/image allow exactly those two hosts.
 */

const ID_PATTERN = /^[\w-]{11}$/;

const valid = (id: string | null | undefined): string | null =>
  id && ID_PATTERN.test(id) ? id : null;

/** The video id from a watch, share, embed, shorts or live link; null for anything else. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return valid(parsed.pathname.slice(1).split('/')[0]);
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
  if (parsed.pathname === '/watch') return valid(parsed.searchParams.get('v'));
  return valid(parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);
}

/**
 * The poster frame. `hqdefault` exists for every video (the larger sizes do
 * not); it is 4:3 with the picture letterboxed, so show it with
 * `object-cover` in a 16:9 frame and the bars fall outside.
 */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** The privacy-preserving player, started at once (it is only loaded on a click). */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
