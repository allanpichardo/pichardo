import {expect, test, type Locator} from '@playwright/test';

const artist = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';

test.beforeEach(async ({page}) => {
  await page.route('https://**', (route) => route.abort());
  await page.goto(`${artist}/styleguide`, {waitUntil: 'domcontentloaded'});
  await expect(page.locator('.MediaGallery [data-masonry="true"]')).toHaveCount(
    2,
  );
});

async function masonryMeasurements(gallery: Locator) {
  return gallery.evaluate((element) => {
    const grid = element.firstElementChild;
    if (!grid) throw new Error('Missing thumbnail grid');
    const bounds = grid.getBoundingClientRect();
    return {
      ready: grid.getAttribute('data-masonry') === 'true',
      width: bounds.width,
      height: bounds.height,
      parentWidth: element.parentElement?.getBoundingClientRect().width,
      gap: parseFloat(getComputedStyle(grid).columnGap),
      items: Array.from(grid.querySelectorAll('button'), (button) => {
        const box = button.getBoundingClientRect();
        return {
          x: box.left - bounds.left,
          y: box.top - bounds.top,
          width: box.width,
          height: box.height,
        };
      }),
    };
  });
}

function expectMasonry(
  layout: Awaited<ReturnType<typeof masonryMeasurements>>,
  columns: number,
) {
  expect(layout.ready).toBe(true);
  expect(layout.width).toBeCloseTo(layout.parentWidth ?? 0, 0);
  const width = (layout.width - (columns - 1) * layout.gap) / columns;
  const tracks = Array.from({length: columns}, (_, index) => ({
    index,
    height: 0,
  }));
  for (const item of layout.items) {
    const track = tracks.reduce((shortest, candidate) =>
      candidate.height < shortest.height ? candidate : shortest,
    );
    expect(item.width).toBeCloseTo(width, 0);
    expect(item.x).toBeCloseTo(track.index * (width + layout.gap), 0);
    expect(item.y).toBeCloseTo(track.height, 0);
    track.height += item.height + layout.gap;
  }
  expect(layout.height).toBeCloseTo(
    Math.max(...tracks.map((track) => track.height)) - layout.gap,
    0,
  );
}

for (const width of [375, 799, 800, 1280, 1920]) {
  test(`gallery preserves CMS ratios and lays out masonry at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({width, height: 900});
    const gallery = page.locator('.MediaGallery').first();
    await gallery
      .locator('img')
      .evaluateAll((images) =>
        images.forEach((image) => image.setAttribute('loading', 'eager')),
      );
    await expect
      .poll(async () =>
        gallery
          .locator('img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await expect
      .poll(async () => {
        try {
          expectMasonry(
            await masonryMeasurements(gallery),
            width < 800 ? 1 : 4,
          );
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);
    await expect(gallery.locator('figcaption')).toHaveCount(0);
    await expect(gallery.locator('video')).toHaveCount(0);
    const ratios = await gallery.locator('img').evaluateAll((images) =>
      images.map((image) => ({
        ratio:
          image.getBoundingClientRect().width /
          image.getBoundingClientRect().height,
        setting: image.getAttribute('data-aspect-ratio'),
        natural:
          image instanceof HTMLImageElement
            ? image.naturalWidth / image.naturalHeight
            : 0,
      })),
    );
    for (const image of ratios) {
      expect(image.ratio).toBeCloseTo(
        image.setting === '4:5'
          ? 4 / 5
          : image.setting === '5:4'
            ? 5 / 4
            : image.natural,
        2,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 375 || width === 1280)
      await gallery.screenshot({
        path: testInfo.outputPath(`masonry-${width}.png`),
      });
    await page.setViewportSize({width: width < 800 ? 1280 : 375, height: 900});
    await expect
      .poll(async () => {
        try {
          expectMasonry(
            await masonryMeasurements(gallery),
            width < 800 ? 4 : 1,
          );
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);
  });
}

test('lightbox opens uncropped images, wraps navigation, traps focus, and restores it', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({width: 1280, height: 900});
  const gallery = page.locator('.MediaGallery').first();
  const trigger = gallery.getByRole('button').first();
  await trigger.focus();
  await expect(trigger).toBeFocused();
  expect(
    await trigger.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe('solid');
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', {name: 'Gallery', exact: true});
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', {name: 'Close', exact: true});
  await expect(close).toBeFocused();
  await expect(dialog.locator('figcaption')).toHaveText(
    '01 / Shape and field. Local sample artwork.',
  );
  await expect(dialog.locator('img')).toHaveAttribute(
    'data-aspect-ratio',
    'fit',
  );
  await expect
    .poll(async () =>
      dialog
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  const ratio = await dialog
    .locator('img')
    .evaluate((image: HTMLImageElement) => ({
      rendered: image.width / image.height,
      natural: image.naturalWidth / image.naturalHeight,
    }));
  expect(ratio.rendered).toBeCloseTo(ratio.natural, 2);
  const colors = await dialog.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    text: getComputedStyle(element).color,
    backdrop: getComputedStyle(element, '::backdrop').backgroundColor,
  }));
  expect(colors).toEqual({
    background: 'rgb(33, 25, 89)',
    text: 'rgb(242, 207, 29)',
    backdrop: 'rgb(33, 25, 89)',
  });
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('hidden');
  await close.press('Tab');
  await expect(
    dialog.getByRole('button', {name: 'Previous item'}),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await close.press('ArrowRight');
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('2/8');
  await expect(dialog.locator('figcaption')).toHaveText(
    '02 / Rhythm and interval. Local sample artwork.',
  );
  await close.press('ArrowLeft');
  await dialog.getByRole('button', {name: 'Previous item'}).click();
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('8/8');
  await dialog.getByRole('button', {name: 'Next item'}).click();
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('1/8');
  await dialog.screenshot({path: testInfo.outputPath('lightbox-desktop.png')});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('');
  await trigger.click();
  await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('single-item galleries are independent and omit navigation and empty captions', async ({
  page,
}) => {
  const galleries = page.locator('.MediaGallery');
  const trigger = galleries.nth(1).getByRole('button');
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: 'Gallery', exact: true});
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('1/1');
  await expect(dialog.getByRole('button', {name: /item/})).toHaveCount(0);
  await expect(dialog.locator('figcaption')).toHaveCount(0);
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await galleries.first().getByRole('button').nth(1).click();
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('2/8');
});

for (const width of [375, 1280]) {
  test(`circular arrow controls stay fixed across media at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({width, height: 900});
    await page
      .locator('.MediaGallery')
      .first()
      .getByRole('button')
      .first()
      .click();
    const dialog = page.getByRole('dialog', {name: 'Gallery', exact: true});
    const image = dialog.locator('img');
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBeGreaterThan(0);
    const imageBox = await image.boundingBox();
    if (!imageBox) throw new Error('Missing lightbox image');
    const stage = dialog
      .getByRole('button', {name: 'Previous item'})
      .locator('..');
    const stageBox = await stage.boundingBox();
    if (!stageBox) throw new Error('Missing media stage');
    const positions = [];
    for (const name of ['Previous item', 'Next item']) {
      const control = dialog.getByRole('button', {name, exact: true});
      const box = await control.boundingBox();
      if (!box) throw new Error('Missing navigation control');
      expect(box.width).toBeCloseTo(box.height, 1);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height / 2).toBeCloseTo(
        stageBox.y + stageBox.height / 2,
        0,
      );
      expect(name === 'Previous item' ? box.x : box.x + box.width).toBeCloseTo(
        name === 'Previous item' ? stageBox.x : stageBox.x + stageBox.width,
        0,
      );
      positions.push({name, box});
      if (name === 'Previous item')
        expect(box.x + box.width).toBeLessThanOrEqual(imageBox.x);
      else expect(box.x).toBeGreaterThanOrEqual(imageBox.x + imageBox.width);
      expect(
        await control.evaluate(
          (element) => getComputedStyle(element).borderRadius,
        ),
      ).toBe('50%');
      await expect(control.locator('svg')).toHaveAttribute(
        'viewBox',
        '0 0 640 640',
      );
      await expect(control).toHaveText('');
      await expect(control).toBeInViewport();
    }
    await dialog.screenshot({
      path: testInfo.outputPath(`lightbox-arrows-${width}.png`),
    });
    const next = dialog.getByRole('button', {name: 'Next item'});
    await next.click();
    await expect(next).toBeFocused();
    await next.press('Enter');
    await expect(
      dialog.getByRole('status', {name: 'Gallery position'}),
    ).toHaveText('3/8');
    for (let position = 4; position <= 8; position += 1) {
      await next.click();
      await expect(
        dialog.getByRole('status', {name: 'Gallery position'}),
      ).toHaveText(`${position}/8`);
      for (const {name, box} of positions) {
        expect(
          await dialog.getByRole('button', {name, exact: true}).boundingBox(),
        ).toEqual(box);
      }
      expect(await stage.evaluate((element) => element.scrollTop)).toBe(0);
      if (position === 5) {
        await expect
          .poll(() =>
            dialog
              .locator('video')
              .evaluate((element: HTMLVideoElement) => element.readyState),
          )
          .toBeGreaterThan(0);
        expect(
          await dialog
            .locator('figure')
            .locator('../..')
            .evaluate(
              (element) => element.scrollHeight <= element.clientHeight,
            ),
        ).toBe(true);
        await dialog.screenshot({
          path: testInfo.outputPath(`lightbox-video-${width}.png`),
        });
      }
    }
  });
}

test('short mobile screens keep controls reachable and long captions scrollable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({width: 375, height: 400});
  await page
    .locator('.MediaGallery')
    .first()
    .getByRole('button')
    .nth(6)
    .click();
  const dialog = page.getByRole('dialog', {name: 'Gallery', exact: true});
  const close = dialog.getByRole('button', {name: 'Close', exact: true});
  await expect(close).toBeInViewport();
  await expect(dialog.locator('figcaption')).toContainText(
    'Extended installation notes',
  );
  const content = dialog.locator('figure').locator('../..');
  const previous = dialog.getByRole('button', {name: 'Previous item'});
  const next = dialog.getByRole('button', {name: 'Next item'});
  const beforeScroll = {
    previous: await previous.boundingBox(),
    next: await next.boundingBox(),
  };
  expect(
    await content.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(
    await content.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  expect({
    previous: await previous.boundingBox(),
    next: await next.boundingBox(),
  }).toEqual(beforeScroll);
  await expect(previous).toBeInViewport();
  await expect(next).toBeInViewport();
  await expect(close).toBeInViewport();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await dialog.screenshot({
    path: testInfo.outputPath('lightbox-mobile-caption.png'),
  });
  await dialog.getByRole('button', {name: 'Next item'}).click();
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('8/8');
  expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test('hovering a video shows its GIF preview without moving the thumbnail', async ({
  page,
}) => {
  const gallery = page.locator('.MediaGallery').first();
  const thumbnail = gallery.getByRole('button').nth(4);
  const image = thumbnail.locator('img');
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/styleguide/motion-study.gif')) requests += 1;
  });
  await expect(image).toHaveAttribute('src', '/styleguide/study-01.svg');
  expect(requests).toBe(0);
  await thumbnail.scrollIntoViewIfNeeded();
  const before = await thumbnail.boundingBox();
  await thumbnail.hover();
  await expect(image).toHaveAttribute('src', '/styleguide/motion-study.gif');
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBe(320);
  expect(await thumbnail.boundingBox()).toEqual(before);
  expect(requests).toBe(1);
  await expect(gallery.locator('video')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(image).toHaveAttribute('src', '/styleguide/study-01.svg');
  await gallery.getByRole('button').nth(7).hover();
  await expect(gallery.getByRole('button').nth(7).locator('img')).toHaveCount(
    0,
  );
  expect(requests).toBe(1);
  await thumbnail.hover();
  await thumbnail.click();
  await expect(
    page.getByRole('dialog', {name: 'Gallery', exact: true}),
  ).toBeVisible();
  await expect(image).toHaveAttribute('src', '/styleguide/study-01.svg');
});

test('a missing hover GIF restores the video poster', async ({page}) => {
  await page.route('**/styleguide/motion-study.gif', (route) =>
    route.fulfill({status: 404, body: 'Missing preview'}),
  );
  const thumbnail = page
    .locator('.MediaGallery')
    .first()
    .getByRole('button')
    .nth(4);
  const request = page.waitForRequest('**/styleguide/motion-study.gif');
  await thumbnail.hover();
  await request;
  await expect(thumbnail.locator('img')).toHaveAttribute(
    'src',
    '/styleguide/study-01.svg',
  );
  await expect
    .poll(() =>
      thumbnail
        .locator('img')
        .evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
});

test('videos play only in the lightbox, retain keyboard controls, and stop on navigation and close', async ({
  page,
}) => {
  const gallery = page.locator('.MediaGallery').first();
  await expect(gallery.locator('video')).toHaveCount(0);
  await gallery.getByRole('button').nth(4).click();
  const dialog = page.getByRole('dialog', {name: 'Gallery', exact: true});
  const video = dialog.locator('video');
  await expect
    .poll(async () =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      video.evaluate((element: HTMLVideoElement) => element.paused),
    )
    .toBe(true);
  await dialog.getByRole('button', {name: 'Play', exact: true}).last().click();
  await expect
    .poll(async () =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  const handle = await video.elementHandle();
  const seek = dialog.getByRole('slider', {name: 'Seek', exact: true});
  await seek.focus();
  await seek.press('ArrowRight');
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('5/8');
  await dialog.getByRole('button', {name: 'Next item'}).click();
  await expect(dialog.locator('video')).toHaveCount(0);
  expect(
    await handle?.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  const fallback = gallery.getByRole('button').nth(7);
  await expect(fallback.locator('img')).toHaveCount(0);
  await fallback.click();
  await expect(
    dialog.getByRole('status', {name: 'Gallery position'}),
  ).toHaveText('8/8');
  await dialog.getByRole('button', {name: 'Play', exact: true}).last().click();
  await expect
    .poll(async () =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  const secondHandle = await video.elementHandle();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(
    await secondHandle?.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
});
