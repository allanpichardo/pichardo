'use client';

import {VimeoVideo} from '@videojs/react/media/vimeo-video';
import {YouTubeVideo} from '@videojs/react/media/youtube-video';
import {
  NeutralVideoSkin,
  Video,
  VideoPlayer as Player,
} from '@videojs/react/video';
import styles from './VideoPlayer.module.scss';

type VideoSource =
  | {
      kind: 'file';
      sources: {src: string; type: string}[];
      poster?: string;
      width?: number | null;
      height?: number | null;
    }
  | {kind: 'youtube' | 'vimeo'; src: string};

export function VideoPlayer({
  source,
  title,
  href,
}: {
  source: VideoSource;
  title: string;
  href: string;
}) {
  const aspectRatio =
    source.kind === 'file' && source.width && source.height
      ? `${source.width} / ${source.height}`
      : '16 / 9';
  const linkLabel =
    source.kind === 'file'
      ? 'Download video'
      : `Watch on ${source.kind === 'youtube' ? 'YouTube' : 'Vimeo'}`;

  return (
    <div
      className={`VideoPlayer ${styles.VideoPlayer}`}
      data-video-provider={source.kind}
      role="region"
      aria-label={title}
    >
      <Player
        key={JSON.stringify(source)}
        title={title}
        poster={source.kind === 'file' ? source.poster : undefined}
      >
        <NeutralVideoSkin className={styles.skin} style={{aspectRatio}}>
          {source.kind === 'file' ? (
            <Video
              aria-label={title}
              playsInline
              preload="metadata"
              poster={source.poster}
              src={source.sources.length ? undefined : href}
              fallback={<a href={href}>{linkLabel}</a>}
            >
              {source.sources.map(({src, type}) => (
                <source key={src} src={src} type={type} />
              ))}
            </Video>
          ) : source.kind === 'youtube' ? (
            <YouTubeVideo src={source.src} playsInline />
          ) : (
            <VimeoVideo src={source.src} playsInline />
          )}
        </NeutralVideoSkin>
      </Player>
    </div>
  );
}
