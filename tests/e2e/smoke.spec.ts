import {expect, test} from '@playwright/test';
import path from 'node:path';

const artist = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';
const professional = process.env.PROFESSIONAL_URL ?? 'http://127.0.0.1:3001';

test('artist homepage renders', async ({page}) => {
  await page.goto(artist);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(
    'Allan Pichardo',
  );
});

test('professional homepage and MDX render', async ({page}) => {
  await page.goto(professional);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(
    'Allan Pichardo',
  );
  await page.goto(`${professional}/mdx-example`);
  await expect(page.getByRole('heading', {name: 'MDX example'})).toBeVisible();
  await expect(
    page.getByText('The value of this JSX expression is 4.'),
  ).toBeVisible();
});

test('health endpoints are healthy and uncached', async ({request}) => {
  for (const origin of [artist, professional]) {
    const response = await request.get(`${origin}/health`);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.json()).toEqual({status: 'ok'});
  }
});

test('Payload login, image upload, variants, and public retrieval work', async ({
  page,
  playwright,
}) => {
  await page.goto(`${artist}/admin/login`);
  await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL ?? '');
  await page.getByLabel(/^password/i).fill(process.env.ADMIN_PASSWORD ?? '');
  await page.getByRole('button', {name: 'Login', exact: true}).click();
  await expect(page).toHaveURL(`${artist}/admin`);
  await page.goto(`${artist}/admin/collections/media/create`);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(path.resolve('tests/fixtures/media.png'));
  await page.getByLabel(/^alt/i).fill('Browser smoke test image');
  await page.getByRole('button', {name: /^save$/i}).click();
  await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+$/);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  expect(id).toBeTruthy();
  const anonymous = await playwright.request.newContext();
  try {
    await expect
      .poll(
        async () => {
          const response = await anonymous.get(`${artist}/api/media/${id}`);
          return response.ok()
            ? (await response.json()).processingStatus
            : 'pending';
        },
        {timeout: 120000},
      )
      .toBe('ready');
    const metadata = await anonymous.get(`${artist}/api/media/${id}`);
    expect(metadata.ok()).toBe(true);
    const media = await metadata.json();
    for (const descriptor of [
      media,
      media.sizes.small,
      media.sizes.medium,
      media.sizes.large,
    ]) {
      const response = await anonymous.get(descriptor.url);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain(descriptor.mimeType);
      expect(response.headers()['cache-control']).toContain('public');
      expect(response.headers()['cache-control']).toContain('max-age=3600');
    }
    await page
      .getByRole('button', {name: 'Reprocess media', exact: true})
      .click();
    await expect(
      page.getByText('Processing queued. Reload to see the latest status.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect
      .poll(
        async () => {
          const response = await anonymous.get(`${artist}/api/media/${id}`);
          if (!response.ok()) return false;
          const current = await response.json();
          return (
            current.processingStatus === 'ready' &&
            current.filename !== media.filename
          );
        },
        {timeout: 120000},
      )
      .toBe(true);
    const reprocessed = await (
      await anonymous.get(`${artist}/api/media/${id}`)
    ).json();
    expect((await anonymous.get(reprocessed.url)).ok()).toBe(true);
    expect((await anonymous.delete(`${artist}/api/media/${id}`)).status()).toBe(
      403,
    );
    expect((await anonymous.get(`${artist}/api/users`)).status()).toBe(403);
  } finally {
    const deleted = await page.request.delete(`${artist}/api/media/${id}`, {
      headers: {Origin: artist},
    });
    expect(deleted.ok()).toBe(true);
    await anonymous.dispose();
  }
});
