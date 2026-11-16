import type {Event} from '../../payload-types';
import {FormattedText} from '../FormattedText/FormattedText';
import styles from './EventDetails.module.scss';

export function EventDetails({event}: {event: Event}) {
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
    <div className={`EventDetails ${styles.EventDetails}`}>
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
    </div>
  );
}
