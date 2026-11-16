import {expect, test} from '@playwright/test';

const artist = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';

for (const width of [375, 799, 800, 801, 1280, 1920]) {
  test(`media figures center, crop, and fit at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({width, height: 900});
    await page.route('https://**', (route) => route.abort());
    await page.goto(`${artist}/styleguide`, {waitUntil: 'domcontentloaded'});
    const figures = page.locator('#content-elements > figure.MediaFigure');
    await expect(figures).toHaveCount(3);

    for (const ratio of ['fit', '5:4', '4:5']) {
      const image = figures.locator(`img[data-aspect-ratio="${ratio}"]`);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
      const measurements = await image.evaluate((el: HTMLImageElement) => {
        const figure = el.closest('figure');
        const parent = figure?.parentElement;
        if (!figure || !parent) throw new Error('Missing figure layout');
        const box = figure.getBoundingClientRect();
        const parentBox = parent.getBoundingClientRect();
        const imageBox = el.getBoundingClientRect();
        const caption = figure.querySelector('figcaption');
        const grid = document.querySelector(
          '[aria-label="12-column layout sample"]',
        );
        const gutter = grid
          ? parseFloat(getComputedStyle(grid).columnGap)
          : NaN;
        return {
          figureWidth: box.width,
          parentWidth: parentBox.width,
          centerOffset:
            box.x + box.width / 2 - (parentBox.x + parentBox.width / 2),
          imageWidth: imageBox.width,
          imageRatio: imageBox.width / imageBox.height,
          naturalRatio: el.naturalWidth / el.naturalHeight,
          objectFit: getComputedStyle(el).objectFit,
          objectPosition: getComputedStyle(el).objectPosition,
          radius: getComputedStyle(el).borderTopLeftRadius,
          token: getComputedStyle(el)
            .getPropertyValue('--media-border-radius')
            .trim(),
          captionOutsideImage: Boolean(
            caption && caption.getBoundingClientRect().top >= imageBox.bottom,
          ),
          figureOverflow: getComputedStyle(figure).overflow,
          gutter,
        };
      });
      const expectedWidth =
        width < 800
          ? measurements.parentWidth
          : (measurements.parentWidth - measurements.gutter) / 2;
      expect(measurements.figureWidth).toBeCloseTo(expectedWidth, 0);
      expect(Math.abs(measurements.centerOffset)).toBeLessThan(1);
      expect(measurements.imageWidth).toBeCloseTo(measurements.figureWidth, 0);
      expect(measurements.imageRatio).toBeCloseTo(
        ratio === 'fit'
          ? measurements.naturalRatio
          : ratio === '5:4'
            ? 5 / 4
            : 4 / 5,
        2,
      );
      if (ratio !== 'fit') {
        expect(measurements.objectFit).toBe('cover');
        expect(measurements.objectPosition).toBe('50% 50%');
      }
      expect(measurements.radius).toBe(measurements.token);
      expect(measurements.captionOutsideImage).toBe(true);
      expect(measurements.figureOverflow).toBe('visible');
      await expect(image.locator('..').locator('figcaption')).toBeVisible();
      if (width === 375 || width === 1280) {
        await image.locator('..').screenshot({
          path: testInfo.outputPath(`${ratio.replace(':', '-')}.png`),
        });
      }
    }

    const player = page.locator('[data-video-provider="file"]');
    const skin = player.locator('[data-theme="neutral"]');
    await expect(skin).toBeVisible();
    const videoBox = await skin.boundingBox();
    expect(videoBox).not.toBeNull();
    if (videoBox) expect(videoBox.width / videoBox.height).toBeCloseTo(1.6, 2);
    expect(
      await skin.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ).toBe('16px');
    const fallback = player.getByRole('link', {
      name: 'Download video',
      exact: true,
    });
    await expect(fallback).toBeVisible();
    expect(
      await fallback.evaluate((el) =>
        Boolean(el.closest('[data-theme="neutral"]')),
      ),
    ).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
