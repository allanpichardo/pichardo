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
  ],
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
