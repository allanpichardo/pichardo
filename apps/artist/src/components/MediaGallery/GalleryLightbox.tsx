import {useEffect, useRef} from 'react';
import type {GalleryBlock, Media} from '../../payload-types';
import {MediaFigure} from '../MediaFigure/MediaFigure';
import styles from './GalleryLightbox.module.scss';

const arrow = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    aria-hidden="true"
    focusable="false"
  >
    {/* Font Awesome Pro v7.3.1 by @fontawesome. https://fontawesome.com/license (Commercial License). Copyright 2026 Fonticons, Inc. */}
    <path d="M598.6 342.6C611.1 330.1 611.1 309.8 598.6 297.3L470.6 169.3C458.1 156.8 437.8 156.8 425.3 169.3C412.8 181.8 412.8 202.1 425.3 214.6L498.7 288L64 288C46.3 288 32 302.3 32 320C32 337.7 46.3 352 64 352L498.7 352L425.3 425.4C412.8 437.9 412.8 458.2 425.3 470.7C437.8 483.2 458.1 483.2 470.6 470.7L598.6 342.7z" />
  </svg>
);

export function GalleryLightbox({
  item,
  index,
  count,
  trigger,
  onDismiss,
  onNavigate,
}: {
  item: GalleryBlock['items'][number] & {media: Media};
  index: number;
  count: number;
  trigger: HTMLButtonElement;
  onDismiss: () => void;
  onNavigate: (index: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const backdropPress = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    closeButton.current?.focus({preventScroll: true});
    return () => {
      dialog.querySelectorAll('video').forEach((video) => video.pause());
      dialog.close();
      document.documentElement.style.overflow = overflow;
      if (trigger.isConnected) trigger.focus({preventScroll: true});
    };
  }, [trigger]);

  useEffect(() => {
    const viewport = content.current;
    if (!viewport) return;
    viewport.scrollTop = 0;
    const figure = viewport.querySelector('figure');
    const visual = figure?.querySelector<HTMLElement>('img, [data-theme]');
    const media = figure?.parentElement;
    if (!figure || !visual || !media) return;
    const fitMedia = () => {
      const extraHeight =
        Math.ceil(
          figure.getBoundingClientRect().height -
            visual.getBoundingClientRect().height,
        ) + 1;
      media.style.setProperty('--media-extra-height', `${extraHeight}px`);
    };
    const observer = new ResizeObserver(fitMedia);
    observer.observe(figure);
    observer.observe(visual);
    fitMedia();
    return () => observer.disconnect();
  }, [index]);

  function pauseMedia() {
    ref.current?.querySelectorAll('video').forEach((video) => video.pause());
  }

  function navigate(direction: number) {
    pauseMedia();
    onNavigate((index + direction + count) % count);
  }

  function dismiss() {
    pauseMedia();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      className={`GalleryLightbox ${styles.GalleryLightbox}`}
      aria-label="Gallery"
      onClose={(event) => {
        if (!event.currentTarget.open) onDismiss();
      }}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (!backdropPress.current || event.target !== event.currentTarget)
          return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          dismiss();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button, a[href], input, select, textarea, [tabindex]',
            ),
          ).filter(
            (element) =>
              element.tabIndex >= 0 &&
              !element.matches(':disabled') &&
              element.getClientRects().length > 0,
          );
          const first = controls[0];
          const last = controls.at(-1);
          const destination =
            event.shiftKey && event.target === first
              ? last
              : !event.shiftKey && event.target === last
                ? first
                : undefined;
          if (destination) {
            event.preventDefault();
            destination.focus();
          }
          return;
        }
        if (
          !(event.target instanceof Element) ||
          event.target.closest(
            '[data-video-provider], input, select, textarea, [contenteditable]',
          )
        )
          return;
        if (
          count > 1 &&
          (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        ) {
          event.preventDefault();
          navigate(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <header>
        <button
          ref={closeButton}
          type="button"
          onClick={dismiss}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            aria-hidden="true"
            focusable="false"
          >
            {/* Font Awesome Free v7.3.1 by @fontawesome. https://fontawesome.com/license/free. Copyright 2026 Fonticons, Inc. */}
            <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z" />
          </svg>
        </button>
      </header>
      <div className={styles.stage} data-navigation={count > 1}>
        {count > 1 && (
          <button
            className={`${styles.arrow} ${styles.previous}`}
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous item"
          >
            {arrow}
          </button>
        )}
        <div className={styles.content} ref={content}>
          <div
            className={styles.media}
            style={
              item.media.mediaKind === 'video'
                ? {
                    width: `min(100%, max(4rem, calc((100cqh - var(--media-extra-height, var(--space-2xl))) * ${item.media.width && item.media.height ? item.media.width / item.media.height : 16 / 9})))`,
                  }
                : undefined
            }
          >
            <MediaFigure
              key={index}
              value={item.media}
              caption={item.caption}
              aspectRatio="fit"
            />
          </div>
        </div>
        {count > 1 && (
          <button
            className={`${styles.arrow} ${styles.next}`}
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next item"
          >
            {arrow}
          </button>
        )}
      </div>
      <footer role="status" aria-live="polite" aria-label="Gallery position">
        {index + 1}/{count}
      </footer>
    </dialog>
  );
}
