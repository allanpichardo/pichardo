import path from 'node:path';

export function getEnvironment(
  env: Readonly<Record<string, string | undefined>>,
) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }

  const secret = env.PAYLOAD_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('PAYLOAD_SECRET must contain at least 32 characters.');
  }

  const artistUrl = env.ARTIST_URL;
  if (env.NODE_ENV === 'production' && !artistUrl) {
    throw new Error('ARTIST_URL is required in production.');
  }
  const server = new URL(artistUrl ?? 'http://localhost:3000');
  if (!['http:', 'https:'].includes(server.protocol)) {
    throw new Error('ARTIST_URL must use HTTP or HTTPS.');
  }

  return {
    databaseUrl,
    secret,
    serverUrl: server.origin,
    mediaDir: path.resolve(env.MEDIA_DIR ?? 'media'),
    push: env.NODE_ENV === 'development' && env.PAYLOAD_DB_PUSH !== 'false',
    secureCookies: server.protocol === 'https:',
  };
}
