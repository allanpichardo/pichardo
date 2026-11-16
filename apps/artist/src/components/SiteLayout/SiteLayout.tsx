import type {ReactNode} from 'react';
import Link from 'next/link';
import styles from './SiteLayout.module.scss';

export function SiteLayout({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <html lang="en" className={`SiteLayout ${styles.SiteLayout} ${className}`}>
      <body className="artist-site">
        <nav className="u-container" aria-label="Main navigation">
          <Link href="/">Home</Link> <Link href="/blog">Blog</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
