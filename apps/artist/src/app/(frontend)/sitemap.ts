import type {MetadataRoute} from 'next';
import {getPublished} from '../../content/queries';
import {contentPath} from '../../content/urls';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.ARTIST_URL || 'http://localhost:3000';
  const groups = await Promise.all(
    (['works', 'events', 'posts', 'pages'] as const).map(async (collection) => {
      const docs = await getPublished(collection);
      return docs.map((doc) => ({
        url: new URL(contentPath(collection, doc.slug), origin).href,
        lastModified: doc.updatedAt,
      }));
    }),
  );
  return [
    {url: new URL('/', origin).href},
    {url: new URL('/blog', origin).href},
    ...groups.flat(),
  ];
}
