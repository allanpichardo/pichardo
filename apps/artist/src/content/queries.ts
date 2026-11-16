import {cache} from 'react';
import {getPayload} from 'payload';
import {notFound} from 'next/navigation';
import config from '@payload-config';
import type {ContentCollection} from './urls';

const publicPayload = cache(() => getPayload({config}));

export const getInfo = cache(async () => {
  const payload = await publicPayload();
  return payload.findGlobal({slug: 'info', depth: 2, overrideAccess: false});
});

export const getPublished = cache(
  async <T extends ContentCollection>(collection: T) => {
    const payload = await publicPayload();
    const result = await payload.find({
      collection,
      overrideAccess: false,
      draft: false,
      where: {_status: {equals: 'published'}},
      sort: collection === 'posts' ? '-publishedAt' : '-createdAt',
      pagination: false,
      depth: 2,
    });
    return result.docs;
  },
);

export const getDocument = cache(
  async <T extends ContentCollection>(collection: T, slug: string) => {
    const payload = await publicPayload();
    const result = await payload.find({
      collection,
      overrideAccess: false,
      draft: false,
      where: {and: [{slug: {equals: slug}}, {_status: {equals: 'published'}}]},
      limit: 1,
      depth: 2,
    });
    return result.docs[0] ?? notFound();
  },
);
