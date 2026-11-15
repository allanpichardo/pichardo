import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Allan Pichardo</h1>
      <p>Software engineer.</p>
      <Link href="/mdx-example">MDX example</Link>
    </main>
  );
}
