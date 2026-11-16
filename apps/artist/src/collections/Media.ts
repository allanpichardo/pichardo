import type {CollectionConfig, Field} from 'payload';
import path from 'node:path';
import {deliverMedia} from '../media-processing/delivery';
import {
  ingestHook,
  markDeletedMedia,
  protectMediaFields,
  queueUploadedMedia,
  reprocessMedia,
} from '../media-processing/lifecycle';

function descriptor(name: string): Field {
  return {
    name,
    type: 'group',
    fields: [
      {name: 'url', type: 'text'},
      {name: 'mimeType', type: 'text'},
      {name: 'filesize', type: 'number'},
      {name: 'width', type: 'number'},
      {name: 'height', type: 'number'},
    ],
  };
}
const systemAccess = {create: () => false, update: () => false};
export function createMediaCollection(mediaDir: string): CollectionConfig {
  return {
    slug: 'media',
    access: {
      read: ({req, isReadingStaticFile}) =>
        req.user || isReadingStaticFile
          ? true
          : {publishedGeneration: {exists: true}},
      create: ({req}) => Boolean(req.user),
      update: ({req}) => Boolean(req.user),
      delete: ({req}) => Boolean(req.user),
    },
    admin: {
      description:
        'Originals are private. Published files are public after processing.',
      defaultColumns: ['filename', 'alt', 'mediaKind', 'processingStatus'],
    },
    upload: {
      staticDir: path.join(mediaDir, 'payload-unused'),
      disableLocalStorage: true,
      filesRequiredOnCreate: false,
      mimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ],
      crop: false,
      focalPoint: false,
      pasteURL: false,
      adminThumbnail: ({doc}) =>
        typeof doc?.thumbnailURL === 'string' ? doc.thumbnailURL : null,
      imageSizes: [
        {name: 'small', width: 400, withoutEnlargement: true},
        {name: 'medium', width: 800, withoutEnlargement: true},
        {name: 'large', width: 1600, withoutEnlargement: true},
      ],
      handlers: [
        (req, {params}) => deliverMedia(req, params.filename, mediaDir),
      ],
    },
    endpoints: [
      {path: '/:id/reprocess', method: 'post', handler: reprocessMedia},
      {
        path: '/file/:filename',
        method: 'head',
        handler: (req) =>
          deliverMedia(
            req,
            typeof req.routeParams?.filename === 'string'
              ? req.routeParams.filename
              : '',
            mediaDir,
          ),
      },
    ],
    hooks: {
      beforeOperation: [ingestHook(mediaDir)],
      beforeChange: [protectMediaFields],
      afterChange: [queueUploadedMedia],
      afterDelete: [markDeletedMedia],
    },
    fields: [
      {name: 'alt', type: 'text', required: true},
      {
        name: 'processingStatus',
        type: 'select',
        options: ['queued', 'processing', 'ready', 'failed'],
        admin: {readOnly: true, position: 'sidebar'},
        access: systemAccess,
      },
      {
        name: 'processingError',
        type: 'text',
        admin: {readOnly: true},
        access: {...systemAccess, read: ({req}) => Boolean(req.user)},
      },
      {
        name: 'mediaKind',
        type: 'select',
        options: ['image', 'video'],
        admin: {readOnly: true, position: 'sidebar'},
        access: systemAccess,
      },
      {
        name: 'thumbnailURL',
        type: 'text',
        admin: {hidden: true},
        access: systemAccess,
      },
      {
        name: 'duration',
        type: 'number',
        admin: {readOnly: true},
        access: systemAccess,
      },
      {
        name: 'video',
        type: 'group',
        admin: {
          readOnly: true,
          condition: (_, sibling) => sibling.mediaKind === 'video',
        },
        access: systemAccess,
        fields: [
          descriptor('webm'),
          descriptor('mp4'),
          descriptor('poster'),
          descriptor('preview'),
        ],
      },
      {
        name: 'requestedGeneration',
        type: 'text',
        index: true,
        admin: {hidden: true},
        access: {...systemAccess, read: () => false},
      },
      {
        name: 'publishedGeneration',
        type: 'text',
        index: true,
        admin: {hidden: true},
        access: {...systemAccess, read: () => false},
      },
      {
        name: 'reprocess',
        type: 'ui',
        admin: {
          components: {Field: '/components/ReprocessMedia#ReprocessMedia'},
        },
      },
    ],
  };
}
