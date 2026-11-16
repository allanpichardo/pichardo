import {validateURL} from './validation';

export function embedSource(value: string): string | undefined {
  if (validateURL(value) !== true) return;
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  if (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host === 'm.youtube.com'
  ) {
    const id =
      host === 'youtu.be'
        ? segments[0]
        : segments[0] === 'watch'
          ? url.searchParams.get('v')
          : ['embed', 'shorts'].includes(segments[0] ?? '')
            ? segments[1]
            : undefined;
    if (id && /^[\w-]{11}$/.test(id))
      return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = segments.at(-1);
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }
  if (host === 'soundcloud.com' && segments.length >= 2) {
    const target = `https://soundcloud.com/${segments.map(encodeURIComponent).join('/')}`;
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(target)}&auto_play=false`;
  }
  if (host === 'open.spotify.com') {
    const parts = segments[0] === 'embed' ? segments.slice(1) : segments;
    const [kind, id] = parts;
    if (
      kind &&
      ['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(
        kind,
      ) &&
      id &&
      /^[a-zA-Z0-9]+$/.test(id)
    ) {
      return `https://open.spotify.com/embed/${kind}/${id}`;
    }
  }
}
