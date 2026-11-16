import {ValidationError} from 'payload';
import type {
  CollectionBeforeValidateHook,
  CollectionConfig,
  Field,
} from 'payload';
import {contentAccess} from '../access/content';
import {baseFields, seoField} from '../content/fields';
import {
  isDateOnly,
  isTimestamp,
  validTimezone,
  validateURL,
} from '../content/validation';
import type {Event} from '../payload-types';

const validateTiming: CollectionBeforeValidateHook<Event> = ({
  data,
  originalDoc,
}) => {
  const event = {...originalDoc, ...data};
  if (event._status !== 'published') return data;
  const allDay = event.timingMode === 'allDay';
  const start: unknown = allDay ? event.startsOn : event.startsAt;
  const end: unknown = allDay ? event.endsOn : event.endsAt;
  const valid = (value: unknown) =>
    allDay ? isDateOnly(value) : isTimestamp(value);
  const errors = [];
  if (!valid(start))
    errors.push({
      path: allDay ? 'startsOn' : 'startsAt',
      message: 'Enter a valid start date.',
    });
  if (
    end &&
    (!valid(end) ||
      typeof start !== 'string' ||
      typeof end !== 'string' ||
      (allDay ? end < start : Date.parse(end) < Date.parse(start)))
  ) {
    errors.push({
      path: allDay ? 'endsOn' : 'endsAt',
      message: 'End must be on or after the start.',
    });
  }
  if (!allDay && !validTimezone(event.timezone))
    errors.push({path: 'timezone', message: 'Enter a valid IANA timezone.'});
  if (errors.length) throw new ValidationError({errors});
  return data;
};

function timingField(name: string, type: 'text' | 'date', mode: string): Field {
  if (type === 'date')
    return {
      name,
      type: 'date',
      admin: {
        condition: (_, sibling: Partial<Event>) => sibling.timingMode === mode,
        date: {pickerAppearance: 'dayAndTime'},
      },
    };
  return {
    name,
    type: 'text',
    admin: {
      condition: (_, sibling: Partial<Event>) => sibling.timingMode === mode,
      description: 'YYYY-MM-DD. End date is inclusive.',
    },
  };
}

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'type', '_status'],
  },
  access: contentAccess,
  versions: {drafts: true},
  hooks: {beforeValidate: [validateTiming]},
  fields: [
    ...baseFields(),
    {
      name: 'type',
      type: 'relationship',
      relationTo: 'event-types',
      admin: {position: 'sidebar'},
    },
    {name: 'description', type: 'richText'},
    {
      name: 'timingMode',
      type: 'select',
      required: true,
      defaultValue: 'timed',
      options: [
        {label: 'Timed', value: 'timed'},
        {label: 'All day', value: 'allDay'},
      ],
    },
    timingField('startsOn', 'text', 'allDay'),
    timingField('endsOn', 'text', 'allDay'),
    timingField('startsAt', 'date', 'timed'),
    timingField('endsAt', 'date', 'timed'),
    {
      name: 'timezone',
      type: 'text',
      defaultValue: 'America/Los_Angeles',
      admin: {
        condition: (_, sibling: Partial<Event>) =>
          sibling.timingMode === 'timed',
        description: 'IANA timezone used to display event times.',
      },
    },
    {name: 'venue', type: 'text'},
    {
      name: 'address',
      type: 'group',
      fields: [
        {name: 'street', type: 'text'},
        {name: 'city', type: 'text'},
        {name: 'region', type: 'text'},
        {name: 'postalCode', type: 'text'},
        {name: 'country', type: 'text'},
      ],
    },
    {name: 'eventURL', label: 'Event URL', type: 'text', validate: validateURL},
    seoField(),
  ],
};
