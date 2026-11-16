import type {CollectionConfig} from 'payload';
import {authenticated} from '../access/content';
import {contentSlug} from '../content/fields';

function taxonomy(
  slug: string,
  singular: string,
  plural: string,
): CollectionConfig {
  return {
    slug,
    labels: {singular, plural},
    admin: {
      useAsTitle: 'name',
      group: 'Taxonomies',
      defaultColumns: ['name', 'slug'],
    },
    access: {
      read: () => true,
      create: authenticated,
      update: authenticated,
      delete: authenticated,
    },
    fields: [
      {name: 'name', type: 'text', required: true},
      contentSlug(false, 'name'),
      {name: 'description', type: 'textarea'},
    ],
  };
}

export const WorkCategories = taxonomy(
  'work-categories',
  'Work category',
  'Work categories',
);
export const WorkTags = taxonomy('work-tags', 'Work tag', 'Work tags');
export const EventTypes = taxonomy('event-types', 'Event type', 'Event types');
export const PostTags = taxonomy('post-tags', 'Post tag', 'Post tags');
