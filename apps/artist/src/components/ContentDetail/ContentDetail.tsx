import styles from './ContentDetail.module.scss';
import {ContentArticle} from '../ContentArticle/ContentArticle';
import {SEO} from '../SEO/SEO';
import {pageSEO} from '../../seo/page-seo';
import type {ContentEntry} from '../../seo/build-seo';

export async function ContentDetail({entry}: {entry: ContentEntry}) {
  const {graph} = await pageSEO(entry);
  return (
    <main className={`ContentDetail ${styles.ContentDetail} u-container`}>
      <SEO graph={graph} />
      <ContentArticle entry={entry} />
    </main>
  );
}
