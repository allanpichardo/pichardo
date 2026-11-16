import type {Metadata} from 'next';
import type {Event, Info, Page, Post, Work} from '../payload-types';
import {publicImage} from '../content/media';
import {contentPath} from '../content/urls';
import {isSchemaSubtype} from './schema-types';

export type ContentEntry =
  | {kind: 'works'; doc: Work}
  | {kind: 'events'; doc: Event}
  | {kind: 'posts'; doc: Post}
  | {kind: 'pages'; doc: Page};
export type SEOEntry =
  ContentEntry | {kind: 'home'} | {kind: 'blog'; posts: Post[]};
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | {[key: string]: JSONValue | undefined};
export type GraphNode = {'@id': string; '@type': string | string[]} & {
  [key: string]: JSONValue | undefined;
};

export function serializeGraph(graph: ReturnType<typeof buildSEO>['graph']) {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

export function buildSEO({
  info,
  entry,
  origin,
}: {
  info: Info;
  entry: SEOEntry;
  origin: string;
}) {
  const name = info.displayName?.trim() || 'Allan Pichardo';
  const siteName = info.siteTitle?.trim() || name;
  const doc = 'doc' in entry ? entry.doc : undefined;
  const path =
    'doc' in entry
      ? contentPath(entry.kind, entry.doc.slug)
      : entry.kind === 'blog'
        ? '/blog'
        : '/';
  const url = new URL(path, origin).href;
  const baseTitle =
    doc?.seo?.title?.trim() ||
    doc?.title ||
    (entry.kind === 'blog' ? 'Blog' : siteName);
  const title =
    entry.kind === 'home' ? baseTitle : `${baseTitle} | ${siteName}`;
  const description =
    doc?.seo?.description?.trim() ||
    doc?.summary?.trim() ||
    info.description?.trim() ||
    'Artist and creative technologist.';
  const image =
    publicImage(doc?.seo?.socialImage) ||
    publicImage(doc?.coverImage) ||
    publicImage(info.socialImage);
  const imageURL = image?.url ? new URL(image.url, origin).href : undefined;
  const favicon = publicImage(info.favicon);
  const personId = 'https://allanpichardo.com/#person';
  const websiteId = new URL('/#website', origin).href;
  const pageId = `${url}#webpage`;
  const entityId = `${url}#entity`;
  const metadata: Metadata = {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: {canonical: url},
    icons: favicon?.url
      ? {
          icon: [
            {
              url: new URL(favicon.url, origin).href,
              type: favicon.mimeType || undefined,
            },
          ],
        }
      : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: entry.kind === 'posts' ? 'article' : 'website',
      images: imageURL
        ? [
            {
              url: imageURL,
              alt: image?.alt,
              width: image?.width ?? undefined,
              height: image?.height ?? undefined,
            },
          ]
        : [],
      ...(entry.kind === 'posts'
        ? {
            publishedTime: entry.doc.publishedAt,
            modifiedTime: entry.doc.updatedAt,
            authors: [name],
          }
        : {}),
    },
    twitter: {
      card: imageURL ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageURL ? [imageURL] : [],
    },
  };
  const graph: GraphNode[] = [
    {
      '@type': 'Person',
      '@id': personId,
      name,
      url: new URL('/', origin).href,
      description: info.description || undefined,
      sameAs: info.socialProfiles?.map((profile) => profile.url),
      image: publicImage(info.socialImage)?.url
        ? new URL(publicImage(info.socialImage)?.url || '', origin).href
        : undefined,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: new URL('/', origin).href,
      name: siteName,
      publisher: {'@id': personId},
      about: {'@id': personId},
    },
    {
      '@type':
        entry.kind === 'pages'
          ? entry.doc.schemaType
          : entry.kind === 'blog'
            ? 'CollectionPage'
            : 'WebPage',
      '@id': pageId,
      url,
      name: baseTitle,
      description,
      isPartOf: {'@id': websiteId},
      ...(entry.kind === 'home'
        ? {mainEntity: {'@id': personId}}
        : 'doc' in entry && entry.kind !== 'pages'
          ? {mainEntity: {'@id': entityId}}
          : {}),
      ...(imageURL
        ? {primaryImageOfPage: {'@type': 'ImageObject', contentUrl: imageURL}}
        : {}),
    },
  ];
  if (entry.kind === 'works' || entry.kind === 'posts') {
    const tags = entry.doc.tags?.flatMap((tag) =>
      typeof tag === 'object' ? [tag.name] : [],
    );
    graph.push({
      '@id': entityId,
      '@type':
        entry.kind === 'works'
          ? [...new Set(entry.doc.schemaTypes)]
          : 'Article',
      name: entry.doc.title,
      description,
      url,
      mainEntityOfPage: {'@id': pageId},
      image: imageURL,
      keywords: tags?.length ? tags : undefined,
      ...(entry.kind === 'posts'
        ? {
            headline: entry.doc.title,
            author: {'@id': personId},
            publisher: {'@id': personId},
            datePublished: entry.doc.publishedAt,
            dateModified: entry.doc.updatedAt,
          }
        : {
            creator: {'@id': personId},
            dateCreated: entry.doc.year ? String(entry.doc.year) : undefined,
            genre:
              typeof entry.doc.category === 'object'
                ? entry.doc.category?.name
                : undefined,
            ...(entry.doc.schemaTypes.some((type) =>
              isSchemaSubtype(type, 'VisualArtwork'),
            )
              ? {
                  artMedium: entry.doc.medium || undefined,
                  size: entry.doc.dimensions || undefined,
                }
              : {}),
          }),
    });
  }
  if (entry.kind === 'events') {
    const event = entry.doc;
    const address = event.address;
    graph.push({
      '@id': entityId,
      '@type': 'Event',
      name: event.title,
      description,
      url,
      image: imageURL,
      mainEntityOfPage: {'@id': pageId},
      startDate:
        event.timingMode === 'allDay' ? event.startsOn : event.startsAt,
      endDate:
        event.timingMode === 'allDay'
          ? event.endsOn || undefined
          : event.endsAt || undefined,
      sameAs: event.eventURL || undefined,
      location:
        event.venue || Object.values(address ?? {}).some(Boolean)
          ? {
              '@type': 'Place',
              name: event.venue || undefined,
              address:
                address && Object.values(address).some(Boolean)
                  ? {
                      '@type': 'PostalAddress',
                      streetAddress: address.street || undefined,
                      addressLocality: address.city || undefined,
                      addressRegion: address.region || undefined,
                      postalCode: address.postalCode || undefined,
                      addressCountry: address.country || undefined,
                    }
                  : undefined,
            }
          : undefined,
    });
  }
  if (entry.kind === 'blog') {
    const listId = `${url}#posts`;
    const pageNode = graph.find((node) => node['@id'] === pageId);
    if (pageNode) pageNode.mainEntity = {'@id': listId};
    graph.push({
      '@id': listId,
      '@type': 'ItemList',
      itemListElement: entry.posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: post.title,
        url: new URL(contentPath('posts', post.slug), origin).href,
      })),
    });
  }
  return {metadata, graph: {'@context': 'https://schema.org', '@graph': graph}};
}
