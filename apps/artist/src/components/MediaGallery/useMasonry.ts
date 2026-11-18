import {useEffect, type RefObject} from 'react';

export function useMasonry(
  ref: RefObject<HTMLDivElement | null>,
  entries: readonly unknown[],
) {
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const buttons = Array.from(
      grid.querySelectorAll<HTMLButtonElement>(':scope > button'),
    );
    let frame = 0;

    const layout = () => {
      const style = getComputedStyle(grid);
      const columns = Number(style.getPropertyValue('--gallery-columns'));
      const gap = parseFloat(style.columnGap);
      grid.dataset.masonry = 'true';
      const columnWidth = buttons[0]?.getBoundingClientRect().width ?? 0;
      const tracks = Array.from({length: columns}, (_, index) => ({
        index,
        height: 0,
      }));
      const measurements = buttons.map((button) => ({
        button,
        height: button.getBoundingClientRect().height,
      }));

      measurements.forEach(({button, height}) => {
        let shortest = tracks[0];
        if (!shortest) return;
        for (const track of tracks) {
          if (track.height < shortest.height) shortest = track;
        }
        button.style.left = `${shortest.index * (columnWidth + gap)}px`;
        button.style.top = `${shortest.height}px`;
        shortest.height += height + gap;
      });
      grid.style.height = `${Math.max(0, ...tracks.map((track) => track.height)) - (buttons.length ? gap : 0)}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(grid);
    buttons.forEach((button) => observer.observe(button));
    layout();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete grid.dataset.masonry;
      grid.style.removeProperty('height');
      buttons.forEach((button) => {
        button.style.removeProperty('left');
        button.style.removeProperty('top');
      });
    };
  }, [ref, entries]);
}
