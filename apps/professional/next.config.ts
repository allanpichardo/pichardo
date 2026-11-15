import createMDX from '@next/mdx';
import type {NextConfig} from 'next';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  ),
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  poweredByHeader: false,
};

export default createMDX()(nextConfig);
