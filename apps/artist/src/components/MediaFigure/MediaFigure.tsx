import type {Media} from '../../payload-types';
import {publicMedia} from '../../content/media';

export function MediaFigure({
  value,
  caption,
}: {
  value?: number | Media | null;
  caption?: string | null;
}) {
  const media = publicMedia(value);
  if (!media?.url) return null;
  return (
    <figure>
      {media.mediaKind === 'video' ? (
        <video
          controls
          preload="metadata"
          poster={media.video?.poster?.url ?? undefined}
          aria-label={media.alt}
        >
          {media.video?.webm?.url && (
            <source src={media.video.webm.url} type="video/webm" />
          )}
          {media.video?.mp4?.url && (
            <source src={media.video.mp4.url} type="video/mp4" />
          )}
          <a href={media.url}>Download video</a>
        </video>
      ) : (
        // Published images are served by the media pipeline with their own responsive renditions.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={media.alt}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
          loading="lazy"
        />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
