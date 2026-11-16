import {describe, expect, it} from 'vitest';
import {buildSEO, serializeGraph} from './build-seo';
import {
  isSchemaSubtype,
  pageSchemaTypes,
  workSchemaTypes,
} from './schema-types';
import catalog from './schema-catalog.json';
import {contentPath} from '../content/urls';
import {embedSource} from '../content/embeds';
import type {Event, Info, Media, Page, Post, Work} from '../payload-types';

const origin = 'https://allanpichardo.com';
const dates = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};
const info: Info = {
  id: 1,
  displayName: 'Allan Pichardo',
  siteTitle: 'Artist site',
  description: 'Artist description',
  socialProfiles: [{label: 'Profile', url: 'https://example.com/artist'}],
};
const work: Work = {
  id: 1,
  title: 'A work',
  slug: 'a-work',
  schemaTypes: ['VisualArtwork', 'SoftwareApplication'],
  medium: 'Software and light',
  ...dates,
};
const post: Post = {
  id: 2,
  title: 'A post',
  slug: 'a-post',
  publishedAt: dates.createdAt,
  ...dates,
};
const page: Page = {
  id: 3,
  title: 'Contact',
  slug: 'contact',
  schemaType: 'ContactPage',
  ...dates,
};
const event: Event = {
  id: 4,
  title: 'Exhibition',
  slug: 'exhibition',
  timingMode: 'allDay',
  startsOn: '2026-03-01',
  endsOn: '2026-03-31',
  venue: 'Gallery',
  address: {city: 'Los Angeles'},
  ...dates,
};
const image: Media = {
  id: 5,
  alt: 'Cover image',
  mediaKind: 'image',
  url: '/api/media/file/cover.webp',
  mimeType: 'image/webp',
  width: 1200,
  height: 630,
  ...dates,
};

describe('Schema.org catalog', () => {
  it('includes deep creative-work and page subtypes from the pinned vocabulary', () => {
    expect(catalog.version).toBe('30.1');
    expect(catalog.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(workSchemaTypes.length).toBeGreaterThan(150);
    for (const type of [
      'CreativeWork',
      'VisualArtwork',
      'Painting',
      'SoftwareSourceCode',
      'WebApplication',
      'MusicComposition',
      'MusicRecording',
      'MusicAlbum',
      'Movie',
    ]) {
      expect(workSchemaTypes).toContain(type);
    }
    for (const type of [
      'WebPage',
      'AboutPage',
      'ContactPage',
      'CollectionPage',
      'ImageGallery',
      'ProfilePage',
      'FAQPage',
    ]) {
      expect(pageSchemaTypes).toContain(type);
    }
    expect(workSchemaTypes).not.toContain('Person');
    expect(pageSchemaTypes).not.toContain('SoftwareApplication');
    expect(isSchemaSubtype('WebApplication', 'CreativeWork')).toBe(true);
    expect(isSchemaSubtype('Unknown', 'CreativeWork')).toBe(false);
  });
});

describe('SEO and connected graphs', () => {
  it('emits multiple types on one work entity with stable person and page references', () => {
    const {graph} = buildSEO({info, origin, entry: {kind: 'works', doc: work}});
    const entity = graph['@graph'].find((node) =>
      node['@id'].endsWith('#entity'),
    );
    expect(entity).toMatchObject({
      '@type': ['VisualArtwork', 'SoftwareApplication'],
      creator: {'@id': `${origin}/#person`},
      artMedium: work.medium,
    });
    expect(
      graph['@graph'].filter((node) => node['@id'].endsWith('#entity')),
    ).toHaveLength(1);
    expect(
      graph['@graph'].find((node) => node['@type'] === 'WebPage')?.mainEntity,
    ).toEqual({'@id': `${origin}/work/a-work#entity`});
  });

  it('uses Article and /blog consistently for metadata and listings', () => {
    const result = buildSEO({info, origin, entry: {kind: 'posts', doc: post}});
    expect(result.metadata.alternates?.canonical).toBe(`${origin}/blog/a-post`);
    expect(
      result.graph['@graph'].find((node) => node['@type'] === 'Article'),
    ).toMatchObject({
      datePublished: post.publishedAt,
      url: `${origin}/blog/a-post`,
    });
    const listing = buildSEO({
      info,
      origin,
      entry: {kind: 'blog', posts: [post]},
    });
    expect(
      listing.graph['@graph'].find((node) => node['@type'] === 'ItemList')
        ?.itemListElement,
    ).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: post.title,
        url: `${origin}/blog/a-post`,
      },
    ]);
    expect(contentPath('posts', post.slug)).toBe('/blog/a-post');
  });

  it('applies Page types directly and preserves all-day Event dates', () => {
    const pageResult = buildSEO({
      info,
      origin,
      entry: {kind: 'pages', doc: page},
    });
    expect(
      pageResult.graph['@graph'].find(
        (node) => node['@type'] === 'ContactPage',
      ),
    ).toMatchObject({'@id': `${origin}/contact#webpage`});
    expect(
      pageResult.graph['@graph'].some((node) =>
        node['@id'].endsWith('#entity'),
      ),
    ).toBe(false);
    const result = buildSEO({
      info,
      origin,
      entry: {kind: 'events', doc: event},
    });
    expect(
      result.graph['@graph'].find((node) => node['@type'] === 'Event'),
    ).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      location: {'@type': 'Place', name: 'Gallery'},
    });
  });

  it('resolves overrides, cover images, defaults, and missing media', () => {
    const globalInfo = {...info, socialImage: image, favicon: image};
    const doc = {
      ...work,
      summary: 'Summary',
      coverImage: image,
      seo: {
        title: 'Override',
        description: 'SEO description',
        socialImage: {...image, url: '/custom.webp'},
      },
    };
    const result = buildSEO({
      info: globalInfo,
      origin,
      entry: {kind: 'works', doc},
    });
    expect(result.metadata.title).toBe('Override | Artist site');
    expect(result.metadata.description).toBe('SEO description');
    expect(result.metadata.openGraph).toMatchObject({
      images: [{url: `${origin}/custom.webp`}],
    });
    expect(result.metadata.icons).toMatchObject({
      icon: [{url: `${origin}${image.url}`}],
    });
    const fallback = buildSEO({
      info,
      origin,
      entry: {kind: 'works', doc: {...work, coverImage: 999}},
    });
    expect(fallback.metadata.description).toBe(info.description);
    expect(fallback.metadata.openGraph).toMatchObject({images: []});
    const software = buildSEO({
      info,
      origin,
      entry: {
        kind: 'works',
        doc: {...work, schemaTypes: ['SoftwareApplication']},
      },
    });
    expect(
      software.graph['@graph'].find((node) => node['@id'].endsWith('#entity')),
    ).not.toHaveProperty('artMedium');
  });

  it('serializes hostile text without allowing script termination', () => {
    const graph = buildSEO({
      info: {...info, displayName: '</script><script>alert(1)</script>'},
      origin,
      entry: {kind: 'home'},
    }).graph;
    const serialized = serializeGraph(graph);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(graph);
  });
});

describe('external embeds', () => {
  it.each([
    [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456'],
    [
      'https://open.spotify.com/track/abc123',
      'https://open.spotify.com/embed/track/abc123',
    ],
  ])('normalizes %s to a trusted embed source', (url, expected) =>
    expect(embedSource(url)?.src).toBe(expected),
  );
  it('supports SoundCloud and rejects unsupported or misleading hosts', () => {
    expect(embedSource('https://soundcloud.com/artist/track')?.src).toContain(
      'https://w.soundcloud.com/player/',
    );
    for (const url of [
      'javascript:alert(1)',
      'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
      'https://example.com/video',
      'https://user:password@youtube.com/watch?v=dQw4w9WgXcQ',
    ])
      expect(embedSource(url)).toBeUndefined();
  });
});
