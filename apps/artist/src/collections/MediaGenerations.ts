import type {CollectionConfig} from 'payload';

export const MediaGenerations: CollectionConfig = {
  slug: 'media-generations',
  admin: {hidden: true},
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {name: 'generation', type: 'text', required: true, unique: true},
    {name: 'mediaId', type: 'number', required: true, index: true},
    {name: 'sourceKey', type: 'text', required: true},
    {name: 'sourceName', type: 'text', required: true},
    {name: 'sourceMimeType', type: 'text', required: true},
    {name: 'sourceBytes', type: 'number', required: true},
    {name: 'sourceHash', type: 'text', required: true},
    {name: 'kind', type: 'select', required: true, options: ['image', 'video']},
    {
      name: 'state',
      type: 'select',
      required: true,
      options: ['queued', 'processing', 'ready', 'failed', 'deleted'],
    },
    {name: 'retiredAt', type: 'date', index: true},
    {
      name: 'artifacts',
      type: 'array',
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            'primary',
            'small',
            'medium',
            'large',
            'mp4',
            'poster',
            'preview',
          ],
        },
        {name: 'filename', type: 'text', required: true, index: true},
        {name: 'mimeType', type: 'text', required: true},
        {name: 'filesize', type: 'number', required: true},
        {name: 'width', type: 'number', required: true},
        {name: 'height', type: 'number', required: true},
      ],
    },
  ],
};
