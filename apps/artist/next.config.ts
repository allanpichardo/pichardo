import {withPayload} from '@payloadcms/next/withPayload';
import type {NextConfig} from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
  poweredByHeader: false,
  headers() {
    return Promise.resolve([
      {
        source: '/admin/:path*',
        headers: [{key: 'Cache-Control', value: 'private, no-store'}],
      },
      {
        source: '/api/:path((?!media/file/).*)',
        headers: [{key: 'Cache-Control', value: 'private, no-store'}],
      },
    ]);
  },
};

export default withPayload(nextConfig);
