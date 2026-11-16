import {ContentBlocks} from '../ContentBlocks/ContentBlocks';
import {EventDetails} from '../EventDetails/EventDetails';
import {MediaFigure} from '../MediaFigure/MediaFigure';
import {SEO} from '../SEO/SEO';
import {pageSEO} from '../../seo/page-seo';
import type {ContentEntry} from '../../seo/build-seo';

export async function ContentDetail({entry}: {entry: ContentEntry}) {
  const {graph} = await pageSEO(entry);
  const doc = entry.doc;
  return (
    <main className="u-container">
      <SEO graph={graph} />
      <article>
        <h1>{doc.title}</h1>
        {doc.summary && <p>{doc.summary}</p>}
        <MediaFigure value={doc.coverImage} />
        {entry.kind === 'events' ? (
          <EventDetails event={entry.doc} />
        ) : (
          <>
            {entry.kind === 'works' && (
              <>
                {typeof entry.doc.category === 'object' &&
                  entry.doc.category && <p>{entry.doc.category.name}</p>}
                <dl>
                  {entry.doc.year && (
                    <>
                      <dt>Year</dt>
                      <dd>{entry.doc.year}</dd>
                    </>
                  )}
                  {entry.doc.medium && (
                    <>
                      <dt>Medium</dt>
                      <dd>{entry.doc.medium}</dd>
                    </>
                  )}
                  {entry.doc.dimensions && (
                    <>
                      <dt>Dimensions</dt>
                      <dd>{entry.doc.dimensions}</dd>
                    </>
                  )}
                </dl>
              </>
            )}
            {entry.kind === 'posts' && (
              <p>
                <time dateTime={entry.doc.publishedAt}>
                  {new Date(entry.doc.publishedAt).toLocaleDateString('en-US', {
                    timeZone: 'UTC',
                  })}
                </time>
              </p>
            )}
            <ContentBlocks blocks={entry.doc.content} />
            {'tags' in entry.doc && entry.doc.tags?.length ? (
              <ul aria-label="Tags">
                {entry.doc.tags.flatMap((tag) =>
                  typeof tag === 'object'
                    ? [<li key={tag.id}>{tag.name}</li>]
                    : [],
                )}
              </ul>
            ) : null}
          </>
        )}
      </article>
    </main>
  );
}
