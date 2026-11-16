import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {bodyFont, headingFont} from '../../styles/fonts';
import '../../styles/globals.scss';
import styles from './layout.module.scss';

export const metadata: Metadata = {title: 'Allan Pichardo'};
export const dynamic = 'force-dynamic';

export default function Layout({children}: {children: ReactNode}) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className={styles.site}>
        <nav className="u-container" aria-label="Main navigation">
          <Link href="/">Home</Link> <Link href="/blog">Blog</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
