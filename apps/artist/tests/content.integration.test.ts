import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {getPayload} from 'payload';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {cleanMedia} from '../src/media-processing/cleanup';
import {publicImage} from '../src/content/media';

let payload: Payload;
let user: User;
let mediaDir: string;
const cleanup: (() => Promise<unknown>)[] = [];
const suffix = crypto.randomUUID();

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!url.pathname.endsWith('_test') || process.env.NODE_ENV !== 'test')
    throw new Error('Content tests require an isolated _test database.');
  mediaDir = await mkdtemp(path.join(tmpdir(), 'pichardo-content-test-'));
  process.env.MEDIA_DIR = mediaDir;
  const {default: config} = await import('../src/payload.config');
  payload = await getPayload({config});
  user = await payload.create({
    collection: 'users',
    data: {
      email: `content-${suffix}@example.test`,
      password: crypto.randomUUID(),
    },
  });
  cleanup.push(() => payload.delete({collection: 'users', id: user.id}));
});

afterAll(async () => {
  if (!payload) return;
  try {
    for (const remove of cleanup.reverse()) await remove();
    await cleanMedia(payload, mediaDir);
  } finally {
    await payload.destroy();
    await rm(mediaDir, {recursive: true, force: true});
  }
});

describe('artist content model', () => {
  it('persists image ratios and fit defaults in content, galleries, and draft versions', async () => {
    const image = await readFile(
      path.resolve('../../tests/fixtures/media.png'),
    );
    const uploaded = await payload.create({
      collection: 'media',
      data: {alt: 'Ratio options'},
      file: {
        data: image,
        name: 'ratio.png',
        mimetype: 'image/png',
        size: image.length,
      },
    });
    cleanup.push(() => payload.delete({collection: 'media', id: uploaded.id}));

    for (const collection of ['works', 'posts', 'pages'] as const) {
      const doc = await payload.create({
        collection,
        user,
        overrideAccess: false,
        draft: true,
        data: {
          title: `Ratios ${collection} ${suffix}`,
          slug: `ratios-${collection}-${suffix}`,
          content: [
            {blockType: 'media', media: uploaded.id, aspectRatio: '5:4'},
            {blockType: 'media', media: uploaded.id},
            {
              blockType: 'gallery',
              items: [
                {media: uploaded.id, aspectRatio: '4:5'},
                {media: uploaded.id, aspectRatio: 'fit'},
                {media: uploaded.id},
              ],
            },
          ],
        },
      });
      cleanup.push(() => payload.delete({collection, id: doc.id}));
      await payload.update({
        collection,
        id: doc.id,
        user,
        overrideAccess: false,
        data: {_status: 'published'},
      });
      const saved = await payload.findByID({collection, id: doc.id});
      expect(saved.content).toMatchObject([
        {blockType: 'media', aspectRatio: '5:4'},
        {blockType: 'media', aspectRatio: 'fit'},
        {
          blockType: 'gallery',
          items: [
            {aspectRatio: '4:5'},
            {aspectRatio: 'fit'},
            {aspectRatio: 'fit'},
          ],
        },
      ]);
      await payload.update({
        collection,
        id: doc.id,
        draft: true,
        user,
        overrideAccess: false,
        data: {
          content: [
            {blockType: 'media', media: uploaded.id, aspectRatio: '4:5'},
            {
              blockType: 'gallery',
              items: [{media: uploaded.id, aspectRatio: '5:4'}],
            },
          ],
        },
      });
      const draft = await payload.findByID({
        collection,
        id: doc.id,
        draft: true,
      });
      expect(draft.content).toMatchObject([
        {blockType: 'media', aspectRatio: '4:5'},
        {blockType: 'gallery', items: [{aspectRatio: '5:4'}]},
      ]);
      const published = await payload.findByID({collection, id: doc.id});
      expect(published.content?.[0]).toMatchObject({aspectRatio: '5:4'});
    }
  });

  it('keeps unpublished work and newer draft edits private, including version reads', async () => {
    const doc = await payload.create({
      collection: 'works',
      user,
      overrideAccess: false,
      draft: true,
      data: {title: `Draft ${suffix}`},
    });
    cleanup.push(() => payload.delete({collection: 'works', id: doc.id}));
    expect(doc.schemaTypes).toEqual(['CreativeWork']);
    const query = {
      collection: 'works',
      where: {id: {equals: doc.id}},
      overrideAccess: false,
    } as const;
    expect((await payload.find(query)).totalDocs).toBe(0);
    await expect(
      payload.findVersions({collection: 'works', overrideAccess: false}),
    ).rejects.toThrow();
    await payload.update({
      collection: 'works',
      id: doc.id,
      user,
      overrideAccess: false,
      data: {
        _status: 'published',
        title: `Published ${suffix}`,
        schemaTypes: ['VisualArtwork', 'SoftwareApplication'],
      },
    });
    expect((await payload.find(query)).docs[0]?.schemaTypes).toEqual([
      'VisualArtwork',
      'SoftwareApplication',
    ]);
    await payload.update({
      collection: 'works',
      id: doc.id,
      user,
      overrideAccess: false,
      draft: true,
      data: {title: `Secret ${suffix}`},
    });
    expect((await payload.find(query)).docs[0]?.title).toBe(
      `Published ${suffix}`,
    );
    const draftRead = await payload.find({...query, draft: true});
    expect(
      draftRead.docs.some((item) => item.title === `Secret ${suffix}`),
    ).toBe(false);
    await expect(
      payload.update({
        collection: 'works',
        id: doc.id,
        overrideAccess: false,
        data: {title: 'Unauthorized'},
      }),
    ).rejects.toThrow();
    await expect(
      payload.delete({collection: 'works', id: doc.id, overrideAccess: false}),
    ).rejects.toThrow();
  });

  it('validates Work types and Page subtypes and reserves public paths', async () => {
    for (const schemaTypes of [[], ['Person']]) {
      await expect(
        payload.create({
          collection: 'works',
          data: {
            title: 'Invalid work',
            slug: `invalid-work-${suffix}`,
            _status: 'published',
            schemaTypes: schemaTypes as never,
          },
        }),
      ).rejects.toThrow();
    }
    for (const slug of [
      'blog',
      'work',
      'events',
      'api',
      'admin',
      'health',
      'invalid/path',
    ]) {
      await expect(
        payload.create({
          collection: 'pages',
          data: {
            title: 'Reserved',
            slug,
            schemaType: 'WebPage',
            _status: 'published',
          },
        }),
      ).rejects.toThrow();
    }
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          title: 'Invalid schema',
          slug: `invalid-schema-${suffix}`,
          _status: 'published',
          schemaType: 'Person' as never,
        },
      }),
    ).rejects.toThrow();
    const page = await payload.create({
      collection: 'pages',
      user,
      overrideAccess: false,
      data: {
        title: `About ${suffix}`,
        slug: `about-${suffix}`,
        _status: 'published',
        schemaType: 'AboutPage',
      },
    });
    cleanup.push(() => payload.delete({collection: 'pages', id: page.id}));
    expect(page.schemaType).toBe('AboutPage');
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          title: page.title,
          slug: page.slug,
          schemaType: 'WebPage',
          _status: 'published',
        },
      }),
    ).rejects.toThrow();
  });

  it('creates independent taxonomy relationships and a default publication date', async () => {
    const workTag = await payload.create({
      collection: 'work-tags',
      data: {name: `Process ${suffix}`, slug: `process-${suffix}`},
    });
    cleanup.push(() =>
      payload.delete({collection: 'work-tags', id: workTag.id}),
    );
    const postTag = await payload.create({
      collection: 'post-tags',
      data: {name: `Process ${suffix}`, slug: `process-${suffix}`},
    });
    cleanup.push(() =>
      payload.delete({collection: 'post-tags', id: postTag.id}),
    );
    const category = await payload.create({
      collection: 'work-categories',
      data: {name: `Art ${suffix}`, slug: `art-${suffix}`},
    });
    cleanup.push(() =>
      payload.delete({collection: 'work-categories', id: category.id}),
    );
    const work = await payload.create({
      collection: 'works',
      data: {
        title: `Categorized ${suffix}`,
        slug: `categorized-${suffix}`,
        schemaTypes: ['CreativeWork'],
        category: category.id,
        tags: [workTag.id],
        _status: 'published',
      },
    });
    cleanup.push(() => payload.delete({collection: 'works', id: work.id}));
    const postDraft = await payload.create({
      collection: 'posts',
      draft: true,
      user,
      overrideAccess: false,
      data: {
        title: `Article ${suffix}`,
        tags: [postTag.id],
      },
    });
    cleanup.push(() => payload.delete({collection: 'posts', id: postDraft.id}));
    const post = await payload.update({
      collection: 'posts',
      id: postDraft.id,
      data: {_status: 'published'},
    });
    expect(typeof work.category === 'object' ? work.category?.name : '').toBe(
      category.name,
    );
    expect(typeof post.tags?.[0] === 'object' ? post.tags[0].name : '').toBe(
      postTag.name,
    );
    expect(Number.isFinite(Date.parse(post.publishedAt))).toBe(true);
    await expect(
      payload.create({
        collection: 'works',
        data: {
          title: 'Many categories',
          slug: `many-categories-${suffix}`,
          schemaTypes: ['CreativeWork'],
          category: [category.id] as never,
          _status: 'published',
        },
      }),
    ).rejects.toThrow();
    await expect(
      payload.create({
        collection: 'post-tags',
        data: {name: 'Anonymous', slug: 'anonymous'},
        overrideAccess: false,
      }),
    ).rejects.toThrow();
    expect(
      (await payload.find({collection: 'work-tags', overrideAccess: false}))
        .totalDocs,
    ).toBeGreaterThan(0);
  });

  it('validates all-day ranges, real dates, timed instants, and timezones', async () => {
    for (const timing of [
      {timingMode: 'allDay', startsOn: '2026-02-30'},
      {timingMode: 'allDay', startsOn: '2026-03-02', endsOn: '2026-03-01'},
      {timingMode: 'timed'},
      {timingMode: 'timed', startsAt: '2026-02-30T12:00:00Z'},
      {
        timingMode: 'timed',
        startsAt: '2026-03-01T12:00:00Z',
        timezone: 'Invalid/Zone',
      },
      {
        timingMode: 'timed',
        startsAt: '2026-03-01T12:00:00Z',
        endsAt: '2026-03-01T11:00:00Z',
      },
    ] as const) {
      await expect(
        payload.create({
          collection: 'events',
          data: {
            title: 'Invalid event',
            slug: `invalid-event-${suffix}`,
            _status: 'published',
            ...timing,
          },
        }),
      ).rejects.toThrow();
    }
    const type = await payload.create({
      collection: 'event-types',
      data: {name: `Exhibition ${suffix}`, slug: `exhibition-${suffix}`},
    });
    cleanup.push(() =>
      payload.delete({collection: 'event-types', id: type.id}),
    );
    const event = await payload.create({
      collection: 'events',
      data: {
        title: `All-day ${suffix}`,
        slug: `all-day-${suffix}`,
        type: type.id,
        _status: 'published',
        timingMode: 'allDay',
        startsOn: '2026-03-01',
        endsOn: '2026-03-01',
      },
    });
    cleanup.push(() => payload.delete({collection: 'events', id: event.id}));
    expect(event.startsOn).toBe(event.endsOn);
    const timed = await payload.create({
      collection: 'events',
      data: {
        title: `Timed ${suffix}`,
        slug: `timed-${suffix}`,
        timingMode: 'timed',
        _status: 'published',
        startsAt: '2026-03-01T13:00:00+02:00',
        endsAt: '2026-03-01T12:30:00Z',
      },
    });
    cleanup.push(() => payload.delete({collection: 'events', id: timed.id}));
    expect(timed.timezone).toBe('America/Los_Angeles');
  });

  it('accepts image covers and rejects videos in image-only fields', async () => {
    const image = await readFile(
      path.resolve('../../tests/fixtures/media.png'),
    );
    const video = await readFile(
      path.resolve('../../tests/fixtures/rotated.mp4'),
    );
    const uploadedImage = await payload.create({
      collection: 'media',
      data: {alt: 'Image cover'},
      file: {
        data: image,
        name: 'cover.png',
        mimetype: 'image/png',
        size: image.length,
      },
    });
    cleanup.push(() =>
      payload.delete({collection: 'media', id: uploadedImage.id}),
    );
    const uploadedVideo = await payload.create({
      collection: 'media',
      data: {alt: 'Video'},
      file: {
        data: video,
        name: 'video.mp4',
        mimetype: 'video/mp4',
        size: video.length,
      },
    });
    cleanup.push(() =>
      payload.delete({collection: 'media', id: uploadedVideo.id}),
    );
    const work = await payload.create({
      collection: 'works',
      data: {
        title: 'Image cover',
        slug: `image-cover-${suffix}`,
        schemaTypes: ['CreativeWork'],
        coverImage: uploadedImage.id,
        _status: 'published',
      },
    });
    cleanup.push(() => payload.delete({collection: 'works', id: work.id}));
    await expect(
      payload.update({
        collection: 'works',
        id: work.id,
        data: {coverImage: uploadedVideo.id},
      }),
    ).rejects.toThrow();
    await expect(
      payload.updateGlobal({slug: 'info', data: {favicon: uploadedVideo.id}}),
    ).rejects.toThrow();
    const publicWork = await payload.findByID({
      collection: 'works',
      id: work.id,
      overrideAccess: false,
    });
    expect(publicImage(publicWork.coverImage)).toBeUndefined();
  });

  it('saves Info immediately, rejects anonymous writes and unsafe URLs', async () => {
    const original = await payload.findGlobal({slug: 'info'});
    try {
      await payload.updateGlobal({
        slug: 'info',
        user,
        overrideAccess: false,
        data: {description: `Updated ${suffix}`},
      });
      expect(
        (await payload.findGlobal({slug: 'info', overrideAccess: false}))
          .description,
      ).toBe(`Updated ${suffix}`);
      await expect(
        payload.updateGlobal({
          slug: 'info',
          overrideAccess: false,
          data: {description: 'Anonymous'},
        }),
      ).rejects.toThrow();
      await expect(
        payload.updateGlobal({
          slug: 'info',
          data: {
            socialProfiles: [{label: 'Unsafe', url: 'javascript:alert(1)'}],
          },
        }),
      ).rejects.toThrow();
      await expect(
        payload.create({
          collection: 'pages',
          data: {
            title: 'Unsafe embed',
            slug: `unsafe-embed-${suffix}`,
            schemaType: 'WebPage',
            _status: 'published',
            content: [{blockType: 'embed', url: 'data:text/html,evil'}],
          },
        }),
      ).rejects.toThrow();
    } finally {
      await payload.updateGlobal({
        slug: 'info',
        data: {
          description: original.description ?? null,
          socialProfiles: original.socialProfiles ?? [],
        },
      });
    }
  });
});
