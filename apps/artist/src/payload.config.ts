import {postgresAdapter} from '@payloadcms/db-postgres';
import {buildConfig} from 'payload';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {Users} from './collections/Users';
import {createMediaCollection} from './collections/Media';
import {MediaGenerations} from './collections/MediaGenerations';
import {mediaTask} from './media-processing/task';
import {getEnvironment} from './environment';
import {lexicalEditor, LinkFeature} from '@payloadcms/richtext-lexical';
import {Works} from './collections/Works';
import {Events} from './collections/Events';
import {Posts} from './collections/Posts';
import {Pages} from './collections/Pages';
import {
  WorkCategories,
  WorkTags,
  EventTypes,
  PostTags,
} from './collections/Taxonomies';
import {Info} from './globals/Info';

const env = getEnvironment(process.env);
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: env.secret,
  serverURL: env.serverUrl,
  admin: {
    user: Users.slug,
    importMap: {baseDir: dirname},
  },
  collections: [
    {...Users, auth: {cookies: {secure: env.secureCookies, sameSite: 'Lax'}}},
    createMediaCollection(env.mediaDir),
    MediaGenerations,
    Works,
    Events,
    Posts,
    Pages,
    WorkCategories,
    WorkTags,
    EventTypes,
    PostTags,
  ],
  globals: [Info],
  editor: lexicalEditor({
    features: ({defaultFeatures}) => [
      ...defaultFeatures.filter(
        (feature) => !['upload', 'relationship', 'link'].includes(feature.key),
      ),
      LinkFeature({enabledCollections: []}),
    ],
  }),
  db: postgresAdapter({
    pool: {connectionString: env.databaseUrl},
    migrationDir: path.resolve(dirname, 'migrations'),
    push: env.push,
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  sharp,
  cors: [env.serverUrl],
  csrf: [env.serverUrl],
  graphQL: {disable: true},
  jobs: {tasks: [mediaTask(env.mediaDir)], access: {run: () => false}},
  upload: {limits: {fileSize: 50_000_000}, useTempFiles: true},
});
