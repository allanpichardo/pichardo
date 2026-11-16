import type {PostgresAdapter} from '@payloadcms/db-postgres';
import {getPayload} from 'payload';
import {readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {hostname} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import config from '../payload.config';
import {getEnvironment} from '../environment';
import {prepareStorage} from '../media-processing/storage';
import {cleanMedia} from '../media-processing/cleanup';
import {setWorkerGuard, stopMediaProcesses} from '../media-processing/process';
import {MEDIA_QUEUE} from '../media-processing/types';

const payload = await getPayload({config});
const env = getEnvironment(process.env);
const paths = await prepareStorage(env.mediaDir);
if (payload.db.name !== 'postgres')
  throw new Error('Media worker requires PostgreSQL.');
const database = payload.db as Pick<PostgresAdapter, 'sessions' | 'pool'>;
const connection = await database.pool.connect();
const heartbeat = path.join(paths.work, 'worker-heartbeat');
const processStart =
  process.platform === 'linux'
    ? (await readFile('/proc/self/stat', 'utf8'))
        .split(') ')
        .slice(1)
        .join(') ')
        .split(/\s+/)[19]
    : String(performance.timeOrigin);
const identity = JSON.stringify({
  hostname: hostname(),
  pid: process.pid,
  processStart,
});
let running = true;
const stop = () => {
  running = false;
  stopMediaProcesses();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
connection.on('error', stop);
const lock = await connection.query<{locked: boolean}>(
  'SELECT pg_try_advisory_lock(174921, 1) AS locked',
);
if (!lock.rows[0]?.locked) {
  connection.release();
  await payload.destroy();
  throw new Error('Another media worker already holds the processing lock.');
}
let lockCheck: Promise<void> | undefined;
function verifyLock() {
  lockCheck ??= connection
    .query('SELECT 1')
    .then(() => {})
    .finally(() => {
      lockCheck = undefined;
    });
  return lockCheck;
}
setWorkerGuard(verifyLock);
let timer: ReturnType<typeof setInterval> | undefined;
try {
  await payload.update({
    collection: 'payload-jobs',
    where: {
      queue: {equals: MEDIA_QUEUE},
      processing: {equals: true},
      completedAt: {exists: false},
    },
    data: {processing: false},
    overrideAccess: true,
  });
  const beat = async () => {
    await verifyLock();
    await writeFile(heartbeat, identity);
  };
  await beat();
  timer = setInterval(() => {
    void beat().catch(stop);
  }, 5000);
  payload.logger.info('Media worker ready');
  let nextCleanup = 0;
  while (running) {
    await payload.jobs.run({queue: MEDIA_QUEUE, limit: 1});
    if (Date.now() > nextCleanup) {
      await cleanMedia(payload, env.mediaDir);
      nextCleanup = Date.now() + 60_000;
    }
    if (running) await delay(1000);
  }
} finally {
  stop();
  if (timer) clearInterval(timer);
  await rm(heartbeat, {force: true});
  await lockCheck?.catch(() => {});
  await connection
    .query('SELECT pg_advisory_unlock(174921, 1)')
    .catch(() => {});
  connection.release();
  await payload.destroy();
}
