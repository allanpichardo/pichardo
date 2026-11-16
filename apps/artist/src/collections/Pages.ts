import type {CollectionConfig} from 'payload';
import {contentAccess} from '../access/content';
import {baseFields, blocksField, seoField} from '../content/fields';
import {pageSchemaTypes} from '../seo/schema-types';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', '_status'],
  },
  access: contentAccess,
  versions: {drafts: true},
  fields: [
    ...baseFields(true),
    blocksField(),
    seoField(),
    {
      name: 'schemaType',
      label: 'Schema.org page type',
      type: 'select',
      options: pageSchemaTypes,
      defaultValue: 'WebPage',
      required: true,
    },
  ],
};
