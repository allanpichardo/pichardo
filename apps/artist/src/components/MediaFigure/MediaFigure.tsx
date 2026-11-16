import type {Media, MediaBlock} from '../../payload-types';
import {publicMedia} from '../../content/media';
import {VideoPlayer} from '../VideoPlayer/VideoPlayer';
import styles from './MediaFigure.module.scss';

export function MediaFigure({
  value,
  caption,
  aspectRatio,
}: {
  value?: number | Media | null;
  caption?: string | null;
  aspectRatio?: MediaBlock['aspectRatio'];
}) {
  const media = publicMedia(value);
  if (!media?.url) return null;
  return (
    <figure className={`MediaFigure ${styles.MediaFigure}`}>
      {media.mediaKind === 'video' ? (
        <VideoPlayer
          title={media.alt}
          href={media.url}
          source={{
            kind: 'file',
            poster: media.video?.poster?.url ?? undefined,
            width: media.width,
            height: media.height,
            sources: [
              ...(media.video?.webm?.url
                ? [{src: media.video.webm.url, type: 'video/webm'}]
                : []),
              ...(media.video?.mp4?.url
                ? [{src: media.video.mp4.url, type: 'video/mp4'}]
                : []),
            ],
          }}
        />
      ) : (
        // Published images are served by the media pipeline with their own responsive renditions.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={media.alt}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
          loading="lazy"
          data-aspect-ratio={aspectRatio ?? 'fit'}
        />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
