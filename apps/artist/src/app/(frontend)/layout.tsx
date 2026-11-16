import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {SiteLayout} from '../../components/SiteLayout/SiteLayout';
import {bodyFont, headingFont} from '../../styles/fonts';
import '../../styles/globals.scss';

export const metadata: Metadata = {title: 'Allan Pichardo'};
export const dynamic = 'force-dynamic';

export default function Layout({children}: {children: ReactNode}) {
  return (
    <SiteLayout className={`${headingFont.variable} ${bodyFont.variable}`}>
      {children}
    </SiteLayout>
  );
}
