import type {CollectionConfig} from 'payload';

export function createMediaCollection(mediaDir: string): CollectionConfig {
  return {
    slug: 'media',
    access: {
      read: () => true,
      create: ({req}) => Boolean(req.user),
      update: ({req}) => Boolean(req.user),
      delete: ({req}) => Boolean(req.user),
    },
    admin: {
      description: 'All files in this collection are publicly accessible.',
    },
    upload: {
      staticDir: mediaDir,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      adminThumbnail: 'small',
      imageSizes: [
        {name: 'small', width: 400, withoutEnlargement: true},
        {name: 'medium', width: 800, withoutEnlargement: true},
        {name: 'large', width: 1600, withoutEnlargement: true},
      ],
      modifyResponseHeaders: ({headers}) => {
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        headers.set('X-Content-Type-Options', 'nosniff');
      },
    },
    fields: [{name: 'alt', type: 'text', required: true}],
  };
}
