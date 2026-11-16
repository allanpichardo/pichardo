import {slugField} from 'payload';
import {slugify} from 'payload/shared';
import type {Block, Field, FieldHook, PayloadRequest} from 'payload';
import {validateSlug, validateRequiredURL} from './validation';

export function imageField(name: string, label?: string): Field {
  return {
    name,
    label,
    type: 'upload',
    relationTo: 'media',
    filterOptions: {mediaKind: {equals: 'image'}},
    validate: async (value: unknown, {req}: {req: PayloadRequest}) => {
      if (!value) return true;
      const id = typeof value === 'object' && 'id' in value ? value.id : value;
      if (typeof id !== 'number' && typeof id !== 'string')
        return 'Select an image.';
      const result = await req.payload.find({
        collection: 'media',
        where: {id: {equals: id}},
        depth: 0,
        limit: 1,
        req,
      });
      return (
        result.docs[0]?.mediaKind === 'image' || 'Select an image, not a video.'
      );
    },
  };
}

type SlugDocument = {id: number; slug?: string; title?: string; name?: string};

export function contentSlug(
  isPage = false,
  useAsSlug: 'title' | 'name' = 'title',
): Field {
  const normalize = (value: string) =>
    slugify(value)?.replace(/[-_]+/g, '-').replace(/^-|-$/g, '');
  const generateBeforeValidation: FieldHook<
    SlugDocument,
    string | undefined,
    Partial<SlugDocument>
  > = ({value, siblingData, originalDoc}) =>
    value || originalDoc?.slug || normalize(siblingData[useAsSlug] || '');
  return slugField({
    useAsSlug,
    slugify: ({valueToSlugify}) =>
      typeof valueToSlugify === 'string'
        ? normalize(valueToSlugify)
        : undefined,
    overrides: (row) => ({
      ...row,
      fields: row.fields.map((field) =>
        'name' in field && field.name === 'slug' && field.type === 'text'
          ? {
              ...field,
              hooks: {beforeValidate: [generateBeforeValidation]},
              validate: (value: unknown) => validateSlug(value, isPage),
            }
          : field,
      ),
    }),
  });
}

export function baseFields(isPage = false): Field[] {
  return [
    {name: 'title', type: 'text', required: true},
    contentSlug(isPage),
    {name: 'summary', type: 'textarea'},
    imageField('coverImage'),
  ];
}

export function seoField(): Field {
  return {
    name: 'seo',
    label: 'SEO',
    type: 'group',
    fields: [
      {name: 'title', type: 'text'},
      {name: 'description', type: 'textarea'},
      imageField('socialImage'),
    ],
  };
}

export const contentBlocks: Block[] = [
  {
    slug: 'text',
    interfaceName: 'TextBlock',
    fields: [{name: 'text', type: 'richText', required: true}],
  },
  {
    slug: 'media',
    interfaceName: 'MediaBlock',
    fields: [
      {name: 'media', type: 'upload', relationTo: 'media', required: true},
      {name: 'caption', type: 'text'},
    ],
  },
  {
    slug: 'gallery',
    interfaceName: 'GalleryBlock',
    fields: [
      {
        name: 'items',
        type: 'array',
        minRows: 1,
        required: true,
        fields: [
          {name: 'media', type: 'upload', relationTo: 'media', required: true},
          {name: 'caption', type: 'text'},
        ],
      },
    ],
  },
  {
    slug: 'embed',
    interfaceName: 'EmbedBlock',
    fields: [
      {
        name: 'url',
        type: 'text',
        required: true,
        validate: validateRequiredURL,
      },
      {name: 'caption', type: 'text'},
    ],
  },
];

export function blocksField(): Field {
  return {name: 'content', type: 'blocks', blocks: contentBlocks};
}
