import type {GalleryBlock} from '../../payload-types';
import {MediaFigure} from '../MediaFigure/MediaFigure';
import styles from './MediaGallery.module.scss';

export function MediaGallery({items}: Pick<GalleryBlock, 'items'>) {
  return (
    <div className={`MediaGallery ${styles.MediaGallery}`}>
      {items.map((item, index) => (
        <MediaFigure
          key={item.id ?? index}
          value={item.media}
          caption={item.caption}
          aspectRatio={item.aspectRatio}
        />
      ))}
    </div>
  );
}
