import type {Metadata} from 'next';
import type {ReactNode} from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.PROFESSIONAL_URL ??
      (process.env.NODE_ENV === 'production'
        ? 'https://pichardo.dev'
        : 'http://localhost:3001'),
  ),
  title: 'Allan Pichardo | Software engineer',
  description: 'Professional software engineering portfolio.',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
