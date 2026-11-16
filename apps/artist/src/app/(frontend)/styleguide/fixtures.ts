import type {Event, Info, Media, Work} from '../../../payload-types';

const dates = {
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const sampleText = {
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text: 'A study in repetition. ',
            format: 1,
          },
          {
            type: 'text',
            version: 1,
            text: 'Small rules produce shifting patterns of color and sound. This paragraph comes through the same rich-text renderer as published content. ',
            format: 0,
          },
          {
            type: 'link',
            version: 1,
            fields: {
              url: '#content-elements',
              newTab: false,
              linkType: 'custom',
            },
            children: [
              {
                type: 'text',
                version: 1,
                text: 'Compare the text elements.',
                format: 0,
              },
            ],
          },
        ],
      },
      {
        type: 'quote',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text: 'What changes when a pattern begins to listen?',
            format: 2,
          },
        ],
      },
    ],
  },
} satisfies NonNullable<Info['biography']>;

export const sampleImage = {
  id: 1,
  ...dates,
  alt: 'A yellow circle and pink rectangle over a blue grid on navy.',
  mediaKind: 'image',
  url: '/styleguide/study-01.svg',
  width: 960,
  height: 600,
} satisfies Media;

const secondImage = {
  id: 2,
  ...dates,
  alt: 'Purple and navy bars alternating with blue, pink, and yellow on white.',
  mediaKind: 'image',
  url: '/styleguide/study-02.svg',
  width: 960,
  height: 600,
} satisfies Media;

export const sampleVideo = {
  id: 3,
  ...dates,
  alt: 'A silent three-second study of a yellow square moving across a navy grid.',
  mediaKind: 'video',
  url: '/styleguide/motion-study.mp4',
  width: 640,
  height: 400,
  duration: 3,
  video: {
    mp4: {url: '/styleguide/motion-study.mp4'},
    poster: {url: '/styleguide/study-01.svg'},
  },
} satisfies Media;

export const gallery = [
  {
    blockType: 'gallery',
    items: [
      {
        media: sampleImage,
        caption: '01 / Shape and field. Local sample artwork.',
      },
      {
        media: secondImage,
        caption: '02 / Rhythm and interval. Local sample artwork.',
      },
    ],
  },
] satisfies NonNullable<Work['content']>;

export const embeds = [
  {
    provider: 'YouTube',
    block: {
      blockType: 'embed',
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      caption: 'YouTube / Big Buck Bunny, Blender Foundation. External sample.',
    },
  },
  {
    provider: 'Vimeo',
    block: {
      blockType: 'embed',
      url: 'https://vimeo.com/76979871',
      caption: 'Vimeo / External video sample.',
    },
  },
  {
    provider: 'SoundCloud',
    block: {
      blockType: 'embed',
      url: 'https://soundcloud.com/forss/flickermood',
      caption: 'SoundCloud / Flickermood, Forss. External sample.',
    },
  },
  {
    provider: 'Spotify',
    block: {
      blockType: 'embed',
      url: 'https://open.spotify.com/track/69kOkLUCkxIZYexIgSG8rq',
      caption: 'Spotify / External track sample.',
    },
  },
] satisfies {provider: string; block: NonNullable<Work['content']>[number]}[];

export const fallbackEmbed = [
  {
    blockType: 'embed',
    url: 'https://example.com/project',
    caption: 'Project website / unsupported providers appear as links.',
  },
] satisfies NonNullable<Work['content']>;

export const timedEvent = {
  id: 1,
  ...dates,
  title: 'Listening room',
  slug: 'sample-listening-room',
  timingMode: 'timed',
  startsAt: '2026-11-20T03:00:00Z',
  endsAt: '2026-11-20T05:00:00Z',
  timezone: 'America/Los_Angeles',
  type: {id: 1, name: 'Performance', slug: 'performance', ...dates},
  venue: 'Sample studio',
  address: {street: '123 Example Street', city: 'Los Angeles', region: 'CA'},
  eventURL: 'https://example.com/event',
} satisfies Event;

export const allDayEvent = {
  id: 2,
  ...dates,
  title: 'Open studio',
  slug: 'sample-open-studio',
  timingMode: 'allDay',
  startsOn: '2026-11-21',
  endsOn: '2026-11-22',
  venue: 'Sample gallery',
  description: sampleText,
} satisfies Event;
