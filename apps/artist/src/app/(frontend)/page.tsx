import Link from 'next/link';
import {getInfo, getPublished} from '../../content/queries';
import {contentPath} from '../../content/urls';
import {pageSEO} from '../../seo/page-seo';
import {SEO} from '../../components/SEO/SEO';
import {FormattedText} from '../../components/FormattedText/FormattedText';

export async function generateMetadata() {
  return (await pageSEO({kind: 'home'})).metadata;
}

export default async function Home() {
  const [info, works, events, posts, pages, seo] = await Promise.all([
    getInfo(),
    getPublished('works'),
    getPublished('events'),
    getPublished('posts'),
    getPublished('pages'),
    pageSEO({kind: 'home'}),
  ]);
  const groups = [
    {title: 'Work', collection: 'works', docs: works},
    {title: 'Events', collection: 'events', docs: events},
    {title: 'Blog', collection: 'posts', docs: posts},
    {title: 'Pages', collection: 'pages', docs: pages},
  ] as const;
  return (
    <main className="u-container">
      <SEO graph={seo.graph} />
      <h1>{info.displayName || 'Allan Pichardo'}</h1>
      <p>{info.description || 'Artist and creative technologist.'}</p>
      <FormattedText data={info.biography} />
      {info.socialProfiles?.length ? (
        <ul aria-label="Social profiles">
          {info.socialProfiles.map((profile) => (
            <li key={profile.id || profile.url}>
              <a href={profile.url}>{profile.label}</a>
            </li>
          ))}
        </ul>
      ) : null}
      {groups.map(
        (group) =>
          group.docs.length > 0 && (
            <section key={group.collection}>
              <h2>{group.title}</h2>
              <ul>
                {group.docs.map((doc) => (
                  <li key={doc.id}>
                    <Link href={contentPath(group.collection, doc.slug)}>
                      {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </main>
  );
}
