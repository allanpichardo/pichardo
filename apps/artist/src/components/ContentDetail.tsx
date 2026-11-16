import {ContentBlocks, FormattedText, MediaFigure} from './ContentBlocks';
import {SEO} from './SEO';
import {pageSEO} from '../seo/page-seo';
import type {ContentEntry} from '../seo/build-seo';
import type {Event} from '../payload-types';

function EventDetails({event}: {event: Event}) {
  const allDay = event.timingMode === 'allDay';
  const start = allDay ? event.startsOn : event.startsAt;
  const end = allDay ? event.endsOn : event.endsAt;
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      ...(allDay
        ? {timeZone: 'UTC'}
        : {
            timeStyle: 'short',
            timeZone: event.timezone || 'America/Los_Angeles',
          }),
    }).format(new Date(allDay ? `${value}T00:00:00Z` : value));
  const address = Object.values(event.address ?? {})
    .filter(Boolean)
    .join(', ');
  return (
    <>
      {start && (
        <p>
          <time dateTime={start}>{format(start)}</time>
          {end && (
            <>
              {' '}
              to <time dateTime={end}>{format(end)}</time>
            </>
          )}
          {!allDay && ` (${event.timezone})`}
        </p>
      )}
      {typeof event.type === 'object' && event.type && <p>{event.type.name}</p>}
      {event.venue && <p>{event.venue}</p>}
      {address && <address>{address}</address>}
      <FormattedText data={event.description} />
      {event.eventURL && (
        <p>
          <a href={event.eventURL}>Event website</a>
        </p>
      )}
    </>
  );
}

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
