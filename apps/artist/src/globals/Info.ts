import type {GlobalConfig} from 'payload';
import {authenticated} from '../access/content';
import {imageField} from '../content/fields';
import {validateRequiredURL} from '../content/validation';

export const Info: GlobalConfig = {
  slug: 'info',
  label: 'Info',
  access: {read: () => true, update: authenticated},
  fields: [
    {name: 'displayName', type: 'text'},
    {name: 'siteTitle', type: 'text'},
    {name: 'description', type: 'textarea'},
    {name: 'biography', type: 'richText'},
    imageField('socialImage', 'Default social image'),
    imageField('favicon'),
    {
      name: 'socialProfiles',
      type: 'array',
      fields: [
        {name: 'label', type: 'text', required: true},
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: validateRequiredURL,
        },
      ],
    },
  ],
};
