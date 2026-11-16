import type {CollectionConfig} from 'payload';
import {contentAccess} from '../access/content';
import {baseFields, blocksField, seoField} from '../content/fields';
import {workSchemaTypes} from '../seo/schema-types';

export const Works: CollectionConfig = {
  slug: 'works',
  labels: {singular: 'Work', plural: 'Work'},
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'category', '_status'],
  },
  access: contentAccess,
  versions: {drafts: true},
  fields: [
    ...baseFields(),
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'work-categories',
      admin: {position: 'sidebar'},
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'work-tags',
      hasMany: true,
      admin: {position: 'sidebar'},
    },
    {
      name: 'year',
      type: 'number',
      min: 1,
      max: 9999,
      validate: (value: unknown) =>
        value == null ||
        (typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= 1 &&
          value <= 9999) ||
        'Enter a whole year between 1 and 9999.',
    },
    {name: 'medium', type: 'text'},
    {name: 'dimensions', type: 'text'},
    blocksField(),
    seoField(),
    {
      name: 'schemaTypes',
      label: 'Schema.org types',
      type: 'select',
      hasMany: true,
      options: workSchemaTypes,
      defaultValue: ['CreativeWork'],
      required: true,
      validate: (value) =>
        (Array.isArray(value) &&
          value.length > 0 &&
          value.every((type) => workSchemaTypes.includes(type))) ||
        'Select at least one CreativeWork type.',
      admin: {description: 'Choose all types that describe this work.'},
    },
  ],
};
