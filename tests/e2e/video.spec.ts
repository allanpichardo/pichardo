import {expect, test} from '@playwright/test';

const artist = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';
const filePlayer = '[data-video-provider="file"]';

test('uploaded video supports playback, keyboard seeking, volume, and fullscreen', async ({
  page,
}) => {
  await page.goto(`${artist}/styleguide`);
  const player = page.locator(filePlayer);
  const video = player.locator('video');
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThan(0);
  await expect(video).toHaveAttribute('preload', 'metadata');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);
  await player.getByRole('button', {name: 'Play', exact: true}).last().click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  await player.getByRole('button', {name: 'Pause', exact: true}).last().click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.paused))
    .toBe(true);

  const seek = player.getByRole('slider', {name: 'Seek', exact: true});
  await seek.focus();
  await seek.press('Home');
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeLessThan(0.1);
  await seek.press('End');
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(2.5);
  await player.getByRole('button', {name: 'Mute', exact: true}).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.muted))
    .toBe(true);
  await player.getByRole('button', {name: 'Unmute', exact: true}).click();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.muted))
    .toBe(false);
  await player
    .getByRole('button', {name: 'Enter fullscreen', exact: true})
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    player.getByRole('link', {name: 'Download video', exact: true}),
  ).toBeVisible();
});

test('video embeds share the skin, preserve privacy, and fit mobile layouts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({width: 375, height: 812});
  await page.goto(`${artist}/styleguide`);
  for (const provider of ['file', 'youtube', 'vimeo']) {
    const player = page.locator(`[data-video-provider="${provider}"]`);
    const skin = player.locator('[data-theme="neutral"]');
    await expect(skin).toBeVisible();
    const box = await skin.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      expect(box.width / box.height).toBeCloseTo(
        provider === 'file' ? 1.6 : 16 / 9,
        1,
      );
    }
    const play = player.getByRole('button', {name: 'Play', exact: true}).last();
    await play.focus();
    await expect(play).toBeFocused();
    expect(await play.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
      'solid',
    );
  }
  await expect(
    page.locator('[data-video-provider="youtube"] iframe'),
  ).toHaveAttribute(
    'src',
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ\?.*controls=0/,
  );
  await expect(
    page.locator('[data-video-provider="vimeo"] iframe'),
  ).toHaveAttribute(
    'src',
    /^https:\/\/player\.vimeo\.com\/video\/76979871\?.*controls=0/,
  );
  await expect(
    page.getByTitle('SoundCloud / Flickermood, Forss. External sample.'),
  ).toHaveAttribute('src', /^https:\/\/w\.soundcloud\.com\/player\//);
  await expect(
    page.getByTitle('Spotify / External track sample.'),
  ).toHaveAttribute('src', /^https:\/\/open\.spotify\.com\/embed\//);
  await page.getByRole('link', {name: 'Home', exact: true}).click();
  await expect(page.locator('[data-video-provider]')).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('[data-video-provider]')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('unavailable video retains its download fallback', async ({page}) => {
  await page.route('**/styleguide/motion-study.mp4', (route) =>
    route.fulfill({status: 404, body: 'Missing video'}),
  );
  await page.goto(`${artist}/styleguide`);
  const player = page.locator(filePlayer);
  await player.getByRole('button', {name: 'Play', exact: true}).last().click();
  await expect(
    player.getByRole('link', {name: 'Download video', exact: true}),
  ).toHaveAttribute('href', '/styleguide/motion-study.mp4');
  await expect
    .poll(() =>
      player
        .locator('video')
        .evaluate((el: HTMLVideoElement) => el.networkState),
    )
    .toBe(3);
  await expect(
    player.getByRole('link', {name: 'Download video', exact: true}),
  ).toBeVisible();
});
