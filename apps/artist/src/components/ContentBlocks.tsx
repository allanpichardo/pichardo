import {RichText} from '@payloadcms/richtext-lexical/react';
import type {JSXConvertersFunction} from '@payloadcms/richtext-lexical/react';
import type {Info, Media, Work} from '../payload-types';
import {publicMedia} from '../content/media';
import {embedSource} from '../content/embeds';
import {validateURL} from '../content/validation';

const converters: JSXConvertersFunction = ({defaultConverters}) => ({
  ...defaultConverters,
  upload: () => null,
  relationship: () => null,
  link: ({node, nodesToJSX}) => {
    const href = node.fields.url;
    const children = nodesToJSX({nodes: node.children});
    return typeof href === 'string' &&
      (validateURL(href) === true ||
        /^\/(?!\/)|^#|^mailto:|^tel:/.test(href)) ? (
      <a
        href={href}
        target={node.fields.newTab ? '_blank' : undefined}
        rel={node.fields.newTab ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ) : (
      <>{children}</>
    );
  },
  autolink: ({node, nodesToJSX}) => {
    const href = node.fields.url;
    const children = nodesToJSX({nodes: node.children});
    return typeof href === 'string' && validateURL(href) === true ? (
      <a href={href}>{children}</a>
    ) : (
      <>{children}</>
    );
  },
});

export function FormattedText({data}: {data?: Info['biography']}) {
  return data ? <RichText data={data} converters={converters} /> : null;
}

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
