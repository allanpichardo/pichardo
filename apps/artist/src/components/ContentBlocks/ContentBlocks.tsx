import type {Work} from '../../payload-types';
import {FormattedText} from '../FormattedText/FormattedText';
import {MediaFigure} from '../MediaFigure/MediaFigure';
import {MediaGallery} from '../MediaGallery/MediaGallery';
import {EmbeddedMedia} from '../EmbeddedMedia/EmbeddedMedia';
import styles from './ContentBlocks.module.scss';

export function ContentBlocks({blocks}: {blocks?: Work['content']}) {
  return (
    <div className={`ContentBlocks ${styles.ContentBlocks}`}>
      {blocks?.map((block, index) => {
        const key = block.id ?? index;
        switch (block.blockType) {
          case 'text':
            return <FormattedText key={key} data={block.text} />;
          case 'media':
            return (
              <MediaFigure
                key={key}
                value={block.media}
                caption={block.caption}
                aspectRatio={block.aspectRatio}
              />
            );
          case 'gallery':
            return <MediaGallery key={key} items={block.items} />;
          case 'embed':
            return (
              <EmbeddedMedia
                key={key}
                url={block.url}
                caption={block.caption}
              />
            );
          default: {
            const exhaustive: never = block;
            return exhaustive;
          }
        }
      })}
    </div>
  );
}
