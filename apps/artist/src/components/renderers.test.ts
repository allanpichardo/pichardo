import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {ContentBlocks, FormattedText, MediaFigure} from './ContentBlocks';
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
