import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {ContentBlocks} from './ContentBlocks/ContentBlocks';
import {FormattedText} from './FormattedText/FormattedText';
import {MediaFigure} from './MediaFigure/MediaFigure';
import type {Media, Work} from '../payload-types';

const dates = {
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const image: Media = {
  id: 1,
  alt: 'An image',
  mediaKind: 'image',
  url: '/image.webp',
  ...dates,
};

it('renders public images and video sources, and omits unresolved media', () => {
  expect(renderToStaticMarkup(createElement(MediaFigure, {value: 123}))).toBe(
    '',
  );
  const imageHTML = renderToStaticMarkup(
    createElement(MediaFigure, {value: image, caption: 'Caption'}),
  );
  expect(imageHTML).toContain('alt="An image"');
  expect(imageHTML).toContain('<figcaption>Caption</figcaption>');
  const video: Media = {
    id: 2,
    alt: 'Video',
    mediaKind: 'video',
    url: '/video.webm',
    video: {
      webm: {url: '/video.webm'},
      mp4: {url: '/video.mp4'},
      poster: {url: '/poster.webp'},
    },
    ...dates,
  };
  const html = renderToStaticMarkup(createElement(MediaFigure, {value: video}));
  expect(html).toContain('<video');
  expect(html).toContain('src="/video.webm"');
  expect(html).toContain('src="/video.mp4"');
  expect(html).toContain('poster="/poster.webp"');
  expect(html).toContain('data-theme="neutral"');
  expect(html).toContain('aria-label="Video"');
  expect(html).toContain('Download video');
  expect(html).not.toContain('<video controls');
});

it('uses Video.js for video embeds and retains audio provider iframes and captions', () => {
  const blocks: Work['content'] = [
    {blockType: 'embed', url: 'https://youtu.be/aqz-KE-bpKQ', caption: 'Film'},
    {blockType: 'embed', url: 'https://vimeo.com/123456'},
    {blockType: 'embed', url: 'https://soundcloud.com/artist/track'},
    {blockType: 'embed', url: 'https://open.spotify.com/track/abc123'},
  ];
  const html = renderToStaticMarkup(createElement(ContentBlocks, {blocks}));
  expect(html).toContain('data-video-provider="youtube"');
  expect(html).toContain('data-video-provider="vimeo"');
  expect(html.match(/data-theme="neutral"/g)).toHaveLength(2);
  expect(html).toContain('<figcaption>Film</figcaption>');
  expect(html).toContain('Watch on YouTube');
  expect(html).toContain('Watch on Vimeo');
  expect(html).toContain('https://w.soundcloud.com/player/');
  expect(html).toContain('https://open.spotify.com/embed/track/abc123');
});

it('defaults missing and null image ratios to fit and forwards block and gallery choices', () => {
  for (const aspectRatio of [undefined, null, 'fit', '5:4', '4:5'] as const) {
    const html = renderToStaticMarkup(
      createElement(MediaFigure, {value: image, aspectRatio}),
    );
    expect(html).toContain(`data-aspect-ratio="${aspectRatio ?? 'fit'}"`);
  }
  const blocks: Work['content'] = [
    {blockType: 'media', media: image, aspectRatio: '5:4'},
    {
      blockType: 'gallery',
      items: [{media: image, aspectRatio: '4:5'}, {media: image}],
    },
  ];
  const html = renderToStaticMarkup(createElement(ContentBlocks, {blocks}));
  expect(html.match(/data-aspect-ratio="[^"]+"/g)).toEqual([
    'data-aspect-ratio="5:4"',
    'data-aspect-ratio="4:5"',
    'data-aspect-ratio="fit"',
  ]);
});

it('preserves gallery ordering and renders safe link fallbacks for unsupported embeds', () => {
  const blocks: Work['content'] = [
    {
      blockType: 'gallery',
      items: [
        {media: image, caption: 'First'},
        {media: image, caption: 'Second'},
      ],
    },
    {
      blockType: 'embed',
      url: 'https://example.com/project',
      caption: 'Project link',
    },
    {blockType: 'embed', url: 'javascript:alert(1)'},
  ];
  const html = renderToStaticMarkup(createElement(ContentBlocks, {blocks}));
  expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
  expect(html).toContain('href="https://example.com/project"');
  expect(html).not.toContain('javascript:');
});

it('escapes rich text and rejects unsafe rich-text links', () => {
  const html = renderToStaticMarkup(
    createElement(FormattedText, {
      data: {
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
              children: [
                {
                  type: 'link',
                  version: 1,
                  fields: {url: 'javascript:alert(1)'},
                  children: [
                    {
                      type: 'text',
                      version: 1,
                      text: '<script>alert(1)</script>',
                      format: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    }),
  );
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('&lt;script&gt;');
});
