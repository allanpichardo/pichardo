export type ContentCollection = 'works' | 'events' | 'posts' | 'pages';

export function contentPath(collection: ContentCollection, slug: string) {
  const prefixes = {
    works: '/work',
    events: '/events',
    posts: '/blog',
    pages: '',
  };
  return `${prefixes[collection]}/${encodeURIComponent(slug)}`;
}
