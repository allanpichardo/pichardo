import {postgresAdapter} from '@payloadcms/db-postgres';
import {buildConfig} from 'payload';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {Users} from './collections/Users';
import {createMediaCollection} from './collections/Media';
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
  upload: {limits: {fileSize: 20 * 1024 * 1024}},
});
