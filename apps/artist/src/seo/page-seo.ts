import {getInfo} from '../content/queries';
import {buildSEO} from './build-seo';
import type {SEOEntry} from './build-seo';

export async function pageSEO(entry: SEOEntry) {
  return buildSEO({
    info: await getInfo(),
    entry,
    origin: process.env.ARTIST_URL || 'http://localhost:3000',
  });
}
