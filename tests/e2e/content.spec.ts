import {expect, test} from '@playwright/test';
import type {APIRequestContext} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {
  Event,
  Info,
  Media,
  Page,
  Post,
  Work,
} from '../../apps/artist/src/payload-types';

const artist = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';

test('CMS publishing, content blocks, blog URLs, Info metadata, and connected JSON-LD', async ({
  page,
  playwright,
}) => {
  test.setTimeout(180000);
  const admin = await playwright.request.newContext({
    baseURL: artist,
    extraHTTPHeaders: {Origin: artist},
  });
  const login = await admin.post('/api/users/login', {
    data: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  expect(login.ok()).toBe(true);
  await page.context().addCookies((await admin.storageState()).cookies);
  const anonymous = await playwright.request.newContext({baseURL: artist});
  const originalInfo: Info = await (
    await admin.get('/api/globals/info?depth=0')
  ).json();
  const created: {collection: string; id: number}[] = [];
  const suffix = crypto.randomUUID();
  async function create<T extends {id: number}>(
    collection: string,
    data: object,
  ): Promise<T> {
    const draft =
      ['works', 'events', 'posts', 'pages'].includes(collection) &&
      !('_status' in data && data._status === 'published');
    const response = await admin.post(
      `/api/${collection}${draft ? '?draft=true' : ''}`,
      {data},
    );
    expect(response.ok(), await response.text()).toBe(true);
    const result: {doc: T} = await response.json();
    created.push({collection, id: result.doc.id});
    return result.doc;
  }
  async function graphFrom(context: APIRequestContext, url: string) {
    const response = await context.get(url);
    const html = await response.text();
    expect(response.ok(), html.slice(0, 500)).toBe(true);
    const script =
      /<script type="application\/ld\+json">([^]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeTruthy();
    return {html, graph: JSON.parse(script || '{}')};
  }
  try {
    const upload = await admin.post('/api/media', {
      multipart: {
        _payload: JSON.stringify({alt: 'Content test image'}),
        file: {
          name: 'content.png',
          mimeType: 'image/png',
          buffer: await readFile(path.resolve('tests/fixtures/media.png')),
        },
      },
    });
    expect(upload.ok(), await upload.text()).toBe(true);
    const media: Media = (await upload.json()).doc;
    created.push({collection: 'media', id: media.id});
    await expect
      .poll(
        async () =>
          (await (await admin.get(`/api/media/${media.id}`)).json())
            .processingStatus,
        {timeout: 120000},
      )
      .toBe('ready');
    const ready: Media = await (
      await admin.get(`/api/media/${media.id}`)
    ).json();
    const updatedInfo = await admin.post('/api/globals/info', {
      data: {
        displayName: 'Allan Pichardo',
        siteTitle: `Content test ${suffix}`,
        description: 'Description from Info',
        socialImage: media.id,
        favicon: media.id,
        socialProfiles: [
          {label: 'Artist profile', url: 'https://example.com/artist'},
        ],
      },
    });
    expect(updatedInfo.ok(), await updatedInfo.text()).toBe(true);
    const work = await create<Work>('works', {
      title: `Work ${suffix}`,
      slug: `work-${suffix}`,
      schemaTypes: ['VisualArtwork', 'SoftwareApplication'],
      medium: 'Code and light',
      year: 2026,
      coverImage: media.id,
      content: [
        {
          blockType: 'text',
          text: {
            root: {
              type: 'root',
              version: 1,
              direction: null,
              format: '',
              indent: 0,
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  direction: null,
                  format: '',
                  indent: 0,
                  children: [
                    {
                      type: 'text',
                      version: 1,
                      text: 'Rich text body',
                      format: 0,
                      detail: 0,
                      mode: 'normal',
                      style: '',
                    },
                  ],
                },
              ],
            },
          },
        },
        {blockType: 'media', media: media.id, caption: 'Single image caption'},
        {
          blockType: 'gallery',
          items: [{media: media.id, caption: 'Gallery image caption'}],
        },
        {
          blockType: 'embed',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          caption: 'Video embed',
        },
        {
          blockType: 'embed',
          url: 'https://example.com/project',
          caption: 'External project',
        },
      ],
    });
    expect((await anonymous.get(`/work/${work.slug}`)).status()).toBe(404);
    await page.goto(`${artist}/admin/collections/works/${work.id}`);
    await expect(
      page.getByText('Schema.org types', {exact: false}),
    ).toBeVisible();
    await expect(page.getByText('VisualArtwork', {exact: true})).toBeVisible();
    await expect(
      page.getByText('SoftwareApplication', {exact: true}),
    ).toBeVisible();
    await page.getByRole('button', {name: /^publish changes$/i}).click();
    await expect
      .poll(async () => (await anonymous.get(`/work/${work.slug}`)).status())
      .toBe(200);
    const post = await create<Post>('posts', {
      title: `Post ${suffix}`,
      slug: `post-${suffix}`,
      summary: 'Blog post summary',
      _status: 'published',
    });
    const event = await create<Event>('events', {
      title: `Event ${suffix}`,
      slug: `event-${suffix}`,
      _status: 'published',
      timingMode: 'allDay',
      startsOn: '2026-11-01',
      endsOn: '2026-11-30',
      venue: 'Gallery',
    });
    const general = await create<Page>('pages', {
      title: `Contact ${suffix}`,
      slug: `contact-${suffix}`,
      schemaType: 'ContactPage',
      _status: 'published',
    });
    const draft = await create<Post>('posts', {
      title: `Private ${suffix}`,
      slug: `private-${suffix}`,
    });
    await page.goto(`${artist}/work/${work.slug}`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(work.title);
    await expect(page.getByText('Rich text body', {exact: true})).toBeVisible();
    await expect(page.getByText('Single image caption')).toBeVisible();
    await expect(page.getByText('Gallery image caption')).toBeVisible();
    await expect(page.getByTitle('Video embed')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    await expect(
      page.getByRole('link', {name: 'External project'}),
    ).toHaveAttribute('href', 'https://example.com/project');
    const workResult = await graphFrom(anonymous, `/work/${work.slug}`);
    expect(workResult.graph['@graph']).toContainEqual(
      expect.objectContaining({
        '@type': ['VisualArtwork', 'SoftwareApplication'],
        creator: {'@id': 'https://allanpichardo.com/#person'},
      }),
    );
    await page.goto(`${artist}/blog/${post.slug}`);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(post.title);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      `${artist}/blog/${post.slug}`,
    );
    await expect(page.locator('meta[name=description]')).toHaveAttribute(
      'content',
      'Blog post summary',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new URL(ready.url || '', artist).href,
    );
    await expect(page.locator('link[rel=icon]')).toHaveAttribute(
      'href',
      new URL(ready.url || '', artist).href,
    );
    expect(
      (await graphFrom(anonymous, `/blog/${post.slug}`)).graph['@graph'],
    ).toContainEqual(expect.objectContaining({'@type': 'Article'}));
    expect(
      (await graphFrom(anonymous, `/events/${event.slug}`)).graph['@graph'],
    ).toContainEqual(
      expect.objectContaining({
        '@type': 'Event',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      }),
    );
    expect(
      (await graphFrom(anonymous, `/${general.slug}`)).graph['@graph'],
    ).toContainEqual(expect.objectContaining({'@type': 'ContactPage'}));
    await page.goto(`${artist}/blog`);
    await expect(
      page.getByRole('link', {name: post.title, exact: true}),
    ).toHaveAttribute('href', `/blog/${post.slug}`);
    await expect(page.getByText(draft.title)).toHaveCount(0);
    expect((await anonymous.get(`/blog/${draft.slug}`)).status()).toBe(404);
    const sitemap = await (await anonymous.get('/sitemap.xml')).text();
    expect(sitemap).toContain(`${artist}/blog/${post.slug}`);
    expect(sitemap).not.toContain(draft.slug);
    const changed = await admin.post('/api/globals/info', {
      data: {description: 'Updated immediately'},
    });
    expect(changed.ok()).toBe(true);
    await page.goto(artist);
    await expect(page.locator('meta[name=description]')).toHaveAttribute(
      'content',
      'Updated immediately',
    );
    await expect(
      page.getByText('Updated immediately', {exact: true}),
    ).toBeVisible();
    await admin.patch(`/api/posts/${post.id}?draft=true`, {
      data: {title: `Secret revision ${suffix}`},
    });
    const published = await anonymous.get(`/blog/${post.slug}`);
    expect(await published.text()).not.toContain(`Secret revision ${suffix}`);
  } finally {
    await admin.post('/api/globals/info', {
      data: {
        displayName: originalInfo.displayName ?? null,
        siteTitle: originalInfo.siteTitle ?? null,
        description: originalInfo.description ?? null,
        socialImage: originalInfo.socialImage ?? null,
        favicon: originalInfo.favicon ?? null,
        socialProfiles: originalInfo.socialProfiles ?? [],
      },
    });
    for (const record of created.reverse())
      await admin.delete(`/api/${record.collection}/${record.id}`);
    await admin.dispose();
    await anonymous.dispose();
  }
});
