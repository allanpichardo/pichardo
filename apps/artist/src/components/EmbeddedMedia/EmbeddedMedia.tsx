import type {EmbedBlock} from '../../payload-types';
import {embedSource} from '../../content/embeds';
import {validateURL} from '../../content/validation';
import {VideoPlayer} from '../VideoPlayer/VideoPlayer';
import styles from './EmbeddedMedia.module.scss';

export function EmbeddedMedia({
  url,
  caption,
}: Pick<EmbedBlock, 'url' | 'caption'>) {
  const source = embedSource(url);
  return (
    <figure className={`EmbeddedMedia ${styles.EmbeddedMedia}`}>
      {source && source.kind !== 'iframe' ? (
        <VideoPlayer
          source={source}
          href={url}
          title={caption || 'Embedded video'}
        />
      ) : source ? (
        <iframe
          src={source.src}
          title={caption || 'Embedded media'}
          loading="lazy"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : validateURL(url) === true ? (
        <a href={url}>{caption || url}</a>
      ) : null}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
