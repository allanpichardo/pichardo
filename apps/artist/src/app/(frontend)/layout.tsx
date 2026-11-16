import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import Link from 'next/link';

export const metadata: Metadata = {title: 'Allan Pichardo'};
export const dynamic = 'force-dynamic';

export default function Layout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link> <Link href="/blog">Blog</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
