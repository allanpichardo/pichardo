import type {Work} from '../../payload-types';
import {embedSource} from '../../content/embeds';
import {validateURL} from '../../content/validation';
import {FormattedText} from '../FormattedText/FormattedText';
import {MediaFigure} from '../MediaFigure/MediaFigure';

export function ContentBlocks({blocks}: {blocks?: Work['content']}) {
  return blocks?.map((block, index) => {
    const key = block.id ?? index;
    switch (block.blockType) {
      case 'text':
        return <FormattedText key={key} data={block.text} />;
      case 'media':
        return (
          <MediaFigure key={key} value={block.media} caption={block.caption} />
        );
      case 'gallery':
        return (
          <div key={key}>
            {block.items.map((item, itemIndex) => (
              <MediaFigure
                key={item.id ?? itemIndex}
                value={item.media}
                caption={item.caption}
              />
            ))}
          </div>
        );
      case 'embed': {
        const source = embedSource(block.url);
        return (
          <figure key={key}>
            {source ? (
              <iframe
                src={source}
                title={block.caption || 'Embedded media'}
                loading="lazy"
                allow="encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : validateURL(block.url) === true ? (
              <a href={block.url}>{block.caption || block.url}</a>
            ) : null}
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        );
      }
      default: {
        const exhaustive: never = block;
        return exhaustive;
      }
    }
  });
}
