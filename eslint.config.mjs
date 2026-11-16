import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import {createRequire} from 'node:module';

const requireFromArtist = createRequire(
  new URL('./apps/artist/package.json', import.meta.url),
);

export default defineConfig([
  globalIgnores([
    '**/.next/**',
    '**/node_modules/**',
    '**/next-env.d.ts',
    '**/payload-types.ts',
    '**/importMap.js',
    '**/migrations/**',
    'test-results/**',
    'playwright-report/**',
    '.audit/**',
  ]),
  ...nextVitals,
  {
    settings: {next: {rootDir: ['apps/artist', 'apps/professional']}},
    languageOptions: {
      parserOptions: {
        babelOptions: {presets: [requireFromArtist.resolve('next/babel')]},
      },
    },
  },
  {
    files: ['apps/**/*.ts', 'apps/**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
    },
  },
  prettier,
]);
