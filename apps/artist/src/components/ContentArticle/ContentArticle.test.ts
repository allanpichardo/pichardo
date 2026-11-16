import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import type {ContentEntry} from '../../seo/build-seo';
import {ContentArticle} from './ContentArticle';
import {Styleguide} from '../Styleguide/Styleguide';
import {
  allDayEvent,
  samplePage,
  samplePost,
  sampleWork,
  timedEvent,
} from '../Styleguide/fixtures';

const entries = [
  {kind: 'works', doc: sampleWork},
  {kind: 'posts', doc: samplePost},
  {kind: 'events', doc: timedEvent},
  {kind: 'events', doc: allDayEvent},
  {kind: 'pages', doc: samplePage},
] satisfies ContentEntry[];

it('previews the public article markup for every content type in the styleguide', () => {
  const guide = renderToStaticMarkup(createElement(Styleguide));
  for (const entry of entries) {
    const article = renderToStaticMarkup(
      createElement(ContentArticle, {entry}),
    );
    expect(guide).toContain(article);
  }
});

it('renders work metadata and resolved tags without exposing relationship IDs', () => {
  const html = renderToStaticMarkup(
    createElement(ContentArticle, {
      entry: {
        kind: 'works',
        doc: {...sampleWork, tags: [42, ...sampleWork.tags]},
      },
    }),
  );
  expect(html).toContain('<h1>Field notes</h1>');
  expect(html).toContain('<dt>Year</dt><dd>2026</dd>');
  expect(html).toContain('<dt>Medium</dt><dd>Software, projection, sound</dd>');
  expect(html).toContain('<li>Generative systems</li>');
  expect(html).not.toContain('<li>42</li>');

  const empty = renderToStaticMarkup(
    createElement(ContentArticle, {
      entry: {kind: 'works', doc: {...sampleWork, tags: [42]}},
    }),
  );
  expect(empty).not.toContain('aria-label="Tags"');
});

it('keeps publication dates and timed and all-day event dates in their intended timezones', () => {
  const post = renderToStaticMarkup(
    createElement(ContentArticle, {entry: {kind: 'posts', doc: samplePost}}),
  );
  expect(post).toContain(
    '<time dateTime="2026-11-15T00:00:00Z">11/15/2026</time>',
  );
  const timed = renderToStaticMarkup(
    createElement(ContentArticle, {entry: {kind: 'events', doc: timedEvent}}),
  );
  expect(timed).toContain('November 19, 2026 at 7:00 PM');
  expect(timed).toContain('America/Los_Angeles');
  const allDay = renderToStaticMarkup(
    createElement(ContentArticle, {entry: {kind: 'events', doc: allDayEvent}}),
  );
  expect(allDay).toContain('November 21, 2026');
  expect(allDay).toContain('November 22, 2026');
});
