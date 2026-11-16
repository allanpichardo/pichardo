import Link from 'next/link';
import {getPublished} from '../../../content/queries';
import {contentPath} from '../../../content/urls';
import {pageSEO} from '../../../seo/page-seo';
import {SEO} from '../../../components/SEO';

export async function generateMetadata() {
  return (await pageSEO({kind: 'blog', posts: await getPublished('posts')}))
    .metadata;
}

export default async function BlogPage() {
  const posts = await getPublished('posts');
  const {graph} = await pageSEO({kind: 'blog', posts});
  return (
    <main className="u-container">
      <SEO graph={graph} />
      <h1>Blog</h1>
      {posts.length ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={contentPath('posts', post.slug)}>{post.title}</Link>
              {post.summary && <p>{post.summary}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No posts yet.</p>
      )}
    </main>
  );
}
