'use client';

import {useCallback, useMemo, useRef, useState} from 'react';
import type {GalleryBlock} from '../../payload-types';
import {publicMedia} from '../../content/media';
import {GalleryLightbox} from './GalleryLightbox';
import {useMasonry} from './useMasonry';
import styles from './MediaGallery.module.scss';

export function MediaGallery({items}: Pick<GalleryBlock, 'items'>) {
  const entries = useMemo(
    () =>
      items.flatMap((item) => {
        const media = publicMedia(item.media);
        return media ? [{...item, media}] : [];
      }),
    [items],
  );
  const grid = useRef<HTMLDivElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selection, setSelection] = useState<{
    index: number;
    trigger: HTMLButtonElement;
  } | null>(null);
  const dismiss = useCallback(() => setSelection(null), []);
  const selectedItem = selection ? entries[selection.index] : undefined;
  useMasonry(grid, entries);

  if (!entries.length) return null;

  return (
    <div className={`MediaGallery ${styles.MediaGallery}`}>
      <div ref={grid} className={styles.thumbnails}>
        {entries.map((item, index) => {
          const media = item.media;
          const isVideo = media.mediaKind === 'video';
          const preview = isVideo ? media.video?.preview?.url : undefined;
          const thumbnail = isVideo
            ? previewIndex === index && preview
              ? preview
              : media.video?.poster?.url
            : media.url;
          return (
            <button
              key={item.id ?? index}
              type="button"
              aria-label={`Open ${isVideo ? 'video' : 'image'} ${index + 1}: ${media.alt}`}
              aria-haspopup="dialog"
              onPointerEnter={(event) => {
                if (preview && event.pointerType === 'mouse')
                  setPreviewIndex(index);
              }}
              onPointerLeave={() => setPreviewIndex(null)}
              onClick={(event) => {
                setPreviewIndex(null);
                setSelection({index, trigger: event.currentTarget});
              }}
              style={
                isVideo
                  ? {
                      aspectRatio:
                        media.width && media.height
                          ? `${media.width} / ${media.height}`
                          : '16 / 9',
                    }
                  : undefined
              }
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt=""
                  width={media.width ?? undefined}
                  height={media.height ?? undefined}
                  loading="lazy"
                  onError={() => setPreviewIndex(null)}
                  data-aspect-ratio={
                    isVideo ? 'video' : (item.aspectRatio ?? 'fit')
                  }
                />
              ) : (
                <span className={styles.videoFallback}>Video</span>
              )}
              {isVideo && (
                <span className={styles.play} aria-hidden="true">
                  Play video
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selection && selectedItem && (
        <GalleryLightbox
          item={selectedItem}
          index={selection.index}
          count={entries.length}
          trigger={selection.trigger}
          onDismiss={dismiss}
          onNavigate={(index) => setSelection({...selection, index})}
        />
      )}
    </div>
  );
}
