import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createLocalReq, getPayload} from 'payload';
import type {Payload} from 'payload';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import sharp from 'sharp';
import {processMedia} from '../src/media-processing/task';
import {captureSource} from '../src/media-processing/ingest';
import {deliverMedia} from '../src/media-processing/delivery';
import {cleanMedia} from '../src/media-processing/cleanup';
import type {PostgresAdapter} from '@payloadcms/db-postgres';
import {
  lockMedia,
  withMediaTransaction,
} from '../src/media-processing/database';
import {importLegacyMedia} from '../src/media-processing/legacy';
import {
  queueReprocess,
  reprocessMedia,
} from '../src/media-processing/lifecycle';
import {mediaPaths} from '../src/media-processing/storage';

let payload: Payload;
let root: string;
const ids: number[] = [];
let png: Buffer;
async function upload(
  data = png,
  name = 'image.png',
  mimetype = 'image/png',
  id?: number,
) {
  const file = {data, name, mimetype, size: data.length};
  const media = id
    ? await payload.update({collection: 'media', id, data: {}, file})
    : await payload.create({
        collection: 'media',
        data: {alt: 'Media lifecycle fixture'},
        file,
      });
  if (!id) ids.push(media.id);
  return media;
}
async function generation(id: number) {
  const result = await payload.find({
    collection: 'media-generations',
    where: {mediaId: {equals: id}},
    sort: '-id',
    limit: 1,
  });
  const record = result.docs[0];
  if (!record) throw new Error('Generation not found');
  return record;
}
async function processLatest(id: number) {
  await processMedia(payload, root, (await generation(id)).id);
  return payload.findByID({collection: 'media', id});
}
async function request(filename: string, method = 'GET', range?: string) {
  return deliverMedia(
    await createLocalReq(
      {req: {method, headers: new Headers(range ? {range} : {})}},
      payload,
    ),
    filename,
    root,
  );
}
async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeout = 30_000,
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error('Timed out waiting for media worker');
}
function worker() {
  const child = spawn(
    process.execPath,
    ['node_modules/payload/bin.js', 'run', 'src/scripts/media-worker.ts'],
    {
      cwd: path.resolve('.'),
      env: {...process.env, MEDIA_DIR: root},
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  return {child, output: () => output};
}

beforeAll(async () => {
  if (
    process.env.NODE_ENV !== 'test' ||
    !new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test')
  )
    throw new Error('Use an isolated _test database.');
  root = await mkdtemp(path.join(tmpdir(), 'pichardo-media-lifecycle-'));
  process.env.MEDIA_DIR = root;
  const {default: config} = await import('../src/payload.config');
  payload = await getPayload({config});
  png = await sharp({
    create: {
      width: 1000,
      height: 600,
      channels: 4,
      background: {r: 30, g: 50, b: 90, alpha: 0.6},
    },
  })
    .png()
    .toBuffer();
});
afterAll(async () => {
  if (payload) {
    for (const id of ids) {
      await payload.delete({collection: 'media', id}).catch(() => {});
    }
    await cleanMedia(payload, root);
    await payload.delete({
      collection: 'payload-jobs',
      where: {queue: {equals: 'media'}},
    });
    await payload.destroy();
  }
  if (root) await rm(root, {recursive: true, force: true});
});
describe('private originals and publication', () => {
  it('propagates temporary database failures so queued work remains retryable', async () => {
    const media = await upload();
    const record = await generation(media.id);
    const failure = vi
      .spyOn(payload, 'find')
      .mockRejectedValueOnce(new Error('Database temporarily unavailable'));
    try {
      await expect(processMedia(payload, root, record.id)).rejects.toThrow(
        'Database temporarily unavailable',
      );
    } finally {
      failure.mockRestore();
    }
    expect(
      (await payload.findByID({collection: 'media', id: media.id}))
        .processingStatus,
    ).toBe('queued');
    expect((await processLatest(media.id)).processingStatus).toBe('ready');
  });
  it('does not resurrect a deletion that commits while a worker waits to claim its generation', async () => {
    const media = await upload();
    const record = await generation(media.id);
    const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
    const database = payload.db as Pick<PostgresAdapter, 'pool'>;
    let processing: Promise<void> | undefined;
    await withMediaTransaction(req, async () => {
      await lockMedia(req, media.id);
      processing = processMedia(payload, root, record.id);
      await waitFor(async () =>
        (
          await database.pool.query<{waiting: number}>(
            "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
          )
        ).rows.some((row) => row.waiting > 0),
      );
      await payload.delete({collection: 'media', id: media.id, req});
    });
    await processing;
    expect((await generation(media.id)).state).toBe('deleted');
  });
  it('restores publication metadata from the locked row instead of a stale upload snapshot', async () => {
    const media = await upload();
    await processLatest(media.id);
    const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
    const database = payload.db as Pick<PostgresAdapter, 'pool'>;
    let replacement: ReturnType<typeof upload> | undefined;
    await withMediaTransaction(req, async () => {
      await lockMedia(req, media.id);
      replacement = upload(png, 'replacement.png', 'image/png', media.id);
      await waitFor(async () =>
        (
          await database.pool.query<{waiting: number}>(
            "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
          )
        ).rows.some((row) => row.waiting > 0),
      );
      await payload.update({
        collection: 'media',
        id: media.id,
        req,
        data: {duration: 99},
      });
    });
    if (!replacement) throw new Error('Replacement not started');
    expect((await replacement).duration).toBe(99);
  });
  it('selects the current original after a concurrent retry acquires the row lock', async () => {
    const media = await upload();
    const source = await generation(media.id);
    const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
    const retry = await createLocalReq({}, payload);
    const database = payload.db as Pick<PostgresAdapter, 'pool'>;
    let queued: Promise<void> | undefined;
    const newSourceKey = crypto.randomUUID();
    await withMediaTransaction(req, async () => {
      await lockMedia(req, media.id);
      queued = queueReprocess(retry, media.id);
      await waitFor(async () =>
        (
          await database.pool.query<{waiting: number}>(
            "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
          )
        ).rows.some((row) => row.waiting > 0),
      );
      await payload.create({
        collection: 'media-generations',
        req,
        data: {
          generation: newSourceKey,
          mediaId: media.id,
          sourceKey: newSourceKey,
          sourceName: source.sourceName,
          sourceMimeType: source.sourceMimeType,
          sourceBytes: source.sourceBytes,
          sourceHash: source.sourceHash,
          kind: source.kind,
          state: 'queued',
        },
      });
      await payload.update({
        collection: 'media',
        id: media.id,
        req,
        data: {requestedGeneration: newSourceKey},
      });
    });
    await queued;
    expect((await generation(media.id)).sourceKey).toBe(newSourceKey);
  });

  it('imports legacy images without changing IDs, URLs, or file bytes', async () => {
    const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
    const filename = `legacy-${crypto.randomUUID()}.png`;
    await writeFile(path.join(root, filename), png);
    const media = await payload.create({
      collection: 'media',
      req,
      data: {
        alt: 'Legacy fixture',
        filename,
        mimeType: 'image/png',
        filesize: png.length,
        width: 1000,
        height: 600,
      },
    });
    ids.push(media.id);
    await withMediaTransaction(req, () =>
      importLegacyMedia(payload, req, root),
    );
    const imported = await payload.findByID({
      collection: 'media',
      id: media.id,
    });
    expect(imported.id).toBe(media.id);
    expect(imported.filename).toBe(filename);
    expect(imported.processingStatus).toBe('ready');
    const record = await generation(media.id);
    expect(
      await readFile(path.join(mediaPaths(root).originals, record.sourceKey)),
    ).toEqual(png);
    expect(Buffer.from(await (await request(filename)).arrayBuffer())).toEqual(
      png,
    );
  });
  it('accepts exactly 50 MB and rejects one extra byte before retaining an original', async () => {
    const bytes = Buffer.alloc(50_000_000);
    png.copy(bytes);
    const req = await createLocalReq(
      {
        req: {
          file: {
            data: bytes,
            size: bytes.length,
            name: 'boundary.png',
            mimetype: 'image/png',
          },
        },
      },
      payload,
    );
    const source = await captureSource(req, root);
    expect(source.filesize).toBe(50_000_000);
    await rm(path.join(mediaPaths(root).originals, source.key));
    req.file = {
      data: Buffer.alloc(50_000_001),
      size: 50_000_001,
      name: 'too-large.png',
      mimetype: 'image/png',
    };
    const before = await readdir(mediaPaths(root).originals);
    await expect(captureSource(req, root)).rejects.toThrow('50 MB');
    expect(await readdir(mediaPaths(root).originals)).toEqual(before);
  });
  it('keeps initial uploads private until ready and serves only manifest-listed artifacts', async () => {
    const media = await upload();
    const record = await generation(media.id);
    expect(media.processingStatus).toBe('queued');
    await expect(
      payload.findByID({
        collection: 'media',
        id: media.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow();
    expect((await request(record.sourceKey)).status).toBe(404);
    await expect(
      payload.find({collection: 'media-generations', overrideAccess: false}),
    ).rejects.toThrow();
    await writeFile(path.join(mediaPaths(root).published, 'unlisted.png'), png);
    expect((await request('unlisted.png')).status).toBe(404);
    const ready = await processLatest(media.id);
    if (!ready.filename) throw new Error('Missing published filename');
    const publicRecord = await payload.findByID({
      collection: 'media',
      id: media.id,
      overrideAccess: false,
    });
    expect(publicRecord.requestedGeneration).toBeUndefined();
    expect(publicRecord.publishedGeneration).toBeUndefined();
    expect(publicRecord.processingStatus).toBe('ready');
    expect((await request(ready.filename)).status).toBe(200);
    expect((await request(record.sourceKey)).status).toBe(404);
    expect(
      (await stat(path.join(mediaPaths(root).originals, record.sourceKey)))
        .size,
    ).toBe(png.length);
  });
  it('streams byte ranges and HEAD with exact content lengths and cache headers', async () => {
    const media = await upload();
    const ready = await processLatest(media.id);
    if (!ready.filename || !ready.filesize)
      throw new Error('Missing published media');
    const partial = await request(ready.filename, 'GET', 'bytes=1-10');
    expect(partial.status).toBe(206);
    expect(partial.headers.get('content-range')).toBe(
      `bytes 1-10/${ready.filesize}`,
    );
    expect(partial.headers.get('cache-control')).toContain('max-age=3600');
    expect((await partial.arrayBuffer()).byteLength).toBe(10);
    const head = await request(ready.filename, 'HEAD');
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(ready.filesize));
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    expect(
      (await request(ready.filename, 'GET', `bytes=${ready.filesize}-`)).status,
    ).toBe(416);
  });
  it('preserves the full previous publication during failed cross-kind replacement', async () => {
    const original = await upload();
    const before = await processLatest(original.id);
    const video = await readFile(
      path.resolve('../../tests/fixtures/rotated.mp4'),
    );
    const pending = await upload(video, 'movie.mp4', 'video/mp4', original.id);
    expect(pending.processingStatus).toBe('queued');
    expect(pending.mediaKind).toBe('image');
    expect(pending.filename).toBe(before.filename);
    const record = await generation(original.id);
    await writeFile(
      path.join(mediaPaths(root).originals, record.sourceKey),
      'corrupted after upload',
    );
    await expect(processMedia(payload, root, record.id)).rejects.toThrow();
    const failed = await payload.findByID({
      collection: 'media',
      id: original.id,
    });
    expect(failed.processingStatus).toBe('failed');
    expect(failed.mediaKind).toBe('image');
    expect(failed.filename).toBe(before.filename);
    expect(failed.sizes).toEqual(before.sizes);
    expect((await request(before.filename ?? '')).status).toBe(200);
  });
  it('rejects anonymous retry and queues an authenticated retry', async () => {
    const media = await upload();
    const anonymous = await createLocalReq(
      {req: {routeParams: {id: media.id}}},
      payload,
    );
    expect((await reprocessMedia(anonymous)).status).toBe(403);
    const user = await payload.create({
      collection: 'users',
      data: {
        email: `retry-${crypto.randomUUID()}@example.test`,
        password: crypto.randomUUID(),
      },
    });
    try {
      const req = await createLocalReq(
        {user, req: {routeParams: {id: media.id}}},
        payload,
      );
      expect((await reprocessMedia(req)).status).toBe(200);
      expect((await generation(media.id)).generation).not.toBe(
        media.requestedGeneration,
      );
      expect((await processLatest(media.id)).processingStatus).toBe('ready');
    } finally {
      await payload.delete({collection: 'users', id: user.id});
    }
  });
  it('prevents stale generation publication and cleans all files after deletion', async () => {
    const first = await upload();
    const stale = await generation(first.id);
    await upload(png, 'replacement.png', 'image/png', first.id);
    await processMedia(payload, root, stale.id);
    expect(
      (await payload.findByID({collection: 'media', id: first.id}))
        .publishedGeneration,
    ).toBeFalsy();
    const ready = await processLatest(first.id);
    await payload.delete({collection: 'media', id: first.id});
    expect((await request(ready.filename ?? '')).status).toBe(404);
    await processMedia(payload, root, stale.id);
    expect((await generation(first.id)).state).toBe('deleted');
    await cleanMedia(payload, root);
    await expect(
      stat(path.join(mediaPaths(root).originals, stale.sourceKey)),
    ).rejects.toThrow();
    expect(
      (
        await payload.find({
          collection: 'media-generations',
          where: {mediaId: {equals: first.id}},
        })
      ).totalDocs,
    ).toBe(0);
  });
  it('retires prior public outputs after 24 hours while retaining archival sources', async () => {
    const media = await upload();
    const old = await generation(media.id);
    const published = await processLatest(media.id);
    await upload(png, 'replacement.png', 'image/png', media.id);
    await processLatest(media.id);
    expect((await request(published.filename ?? '')).status).toBe(200);
    await payload.update({
      collection: 'media-generations',
      id: old.id,
      data: {
        retiredAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      },
    });
    expect((await request(published.filename ?? '')).status).toBe(404);
    await cleanMedia(payload, root);
    await expect(
      stat(path.join(mediaPaths(root).published, published.filename ?? '')),
    ).rejects.toThrow();
    expect(
      (await stat(path.join(mediaPaths(root).originals, old.sourceKey))).size,
    ).toBe(png.length);
  });
});
describe('exclusive worker recovery', () => {
  it('reclaims interrupted jobs, publishes their real outputs, and rejects a second worker', async () => {
    await payload.delete({
      collection: 'payload-jobs',
      where: {queue: {equals: 'media'}},
    });
    const media = await upload();
    const jobs = await payload.find({
      collection: 'payload-jobs',
      where: {queue: {equals: 'media'}},
      limit: 0,
    });
    expect(jobs.docs).toHaveLength(1);
    const interrupted = jobs.docs[0];
    if (!interrupted) throw new Error('Missing interrupted job');
    await payload.update({
      collection: 'payload-jobs',
      id: interrupted.id,
      data: {processing: true},
    });
    const first = worker();
    try {
      await waitFor(() => first.output().includes('Media worker ready'));
      const second = worker();
      await waitFor(() => second.child.exitCode !== null);
      expect(second.child.exitCode).not.toBe(0);
      expect(second.output()).toContain('Another media worker');
      await waitFor(
        async () =>
          (await payload.findByID({collection: 'media', id: media.id}))
            .processingStatus === 'ready',
      );
      const ready = await payload.findByID({collection: 'media', id: media.id});
      expect((await request(ready.filename ?? '')).status).toBe(200);
      const heartbeat: unknown = JSON.parse(
        await readFile(
          path.join(mediaPaths(root).work, 'worker-heartbeat'),
          'utf8',
        ),
      );
      expect(heartbeat).toMatchObject({pid: first.child.pid});
    } finally {
      first.child.kill('SIGTERM');
      await waitFor(
        () => first.child.exitCode !== null || first.child.signalCode !== null,
      );
    }
  }, 60_000);
});
