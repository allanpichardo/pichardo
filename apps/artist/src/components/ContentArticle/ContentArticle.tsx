import type {ContentEntry} from '../../seo/build-seo';
import {ContentHeader} from '../ContentHeader/ContentHeader';
import {ContentBlocks} from '../ContentBlocks/ContentBlocks';
import {EventDetails} from '../EventDetails/EventDetails';
import {MediaFigure} from '../MediaFigure/MediaFigure';
import {WorkMetadata} from '../WorkMetadata/WorkMetadata';
import {PostMetadata} from '../PostMetadata/PostMetadata';
import {TagList} from '../TagList/TagList';
import styles from './ContentArticle.module.scss';

export function ContentArticle({entry}: {entry: ContentEntry}) {
  const doc = entry.doc;
  return (
    <article className={`ContentArticle ${styles.ContentArticle}`}>
      <ContentHeader title={doc.title} summary={doc.summary} />
      <MediaFigure value={doc.coverImage} />
      {entry.kind === 'events' ? (
        <EventDetails event={entry.doc} />
      ) : (
        <>
          {entry.kind === 'works' && <WorkMetadata work={entry.doc} />}
          {entry.kind === 'posts' && (
            <PostMetadata publishedAt={entry.doc.publishedAt} />
          )}
          <ContentBlocks blocks={entry.doc.content} />
          {'tags' in doc && <TagList tags={doc.tags} />}
        </>
      )}
    </article>
  );
}
