import type {CollectionConfig} from 'payload';
import {contentAccess} from '../access/content';
import {baseFields, blocksField, seoField} from '../content/fields';
import type {FieldHook} from 'payload';
import type {Post} from '../payload-types';

const publicationDate: FieldHook<Post, string | undefined> = ({
  value,
  siblingData,
}) =>
  value ||
  (siblingData._status === 'published' ? new Date().toISOString() : undefined);

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'publishedAt', '_status'],
  },
  access: contentAccess,
  versions: {drafts: true},
  fields: [
    ...baseFields(),
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'post-tags',
      hasMany: true,
      admin: {position: 'sidebar'},
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      admin: {position: 'sidebar', date: {pickerAppearance: 'dayAndTime'}},
      hooks: {beforeValidate: [publicationDate]},
    },
    blocksField(),
    seoField(),
  ],
};
