import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {getPayload} from 'payload';
import type {Payload} from 'payload';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

let payload: Payload;
let mediaDir: string;
const mediaIds: number[] = [];
let userId: number | undefined;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!url.pathname.endsWith('_test') || process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Integration tests require NODE_ENV=test and a database ending in _test.',
    );
  }
  mediaDir = await mkdtemp(path.join(tmpdir(), 'pichardo-media-test-'));
  process.env.MEDIA_DIR = mediaDir;
  const {default: config} = await import('../src/payload.config');
  payload = await getPayload({config});
});

afterAll(async () => {
  if (payload) {
    for (const id of mediaIds) await payload.delete({collection: 'media', id});
    if (userId) await payload.delete({collection: 'users', id: userId});
    await payload.destroy();
  }
  if (mediaDir) await rm(mediaDir, {recursive: true, force: true});
});

describe('Payload with PostgreSQL', () => {
  it('bootstrap recognizes an existing administrator regardless of email case', async () => {
    const email = `bootstrap-${crypto.randomUUID()}@example.test`;
    const password = crypto.randomUUID();
    const user = await payload.create({
      collection: 'users',
      data: {email, password},
    });
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const {stdout} = await promisify(execFile)(
          process.execPath,
          ['node_modules/payload/bin.js', 'run', 'src/scripts/bootstrap.ts'],
          {
            env: {
              ...process.env,
              ADMIN_EMAIL: email.toUpperCase(),
              ADMIN_PASSWORD: crypto.randomUUID(),
            },
            timeout: 15000,
          },
        );
        expect(stdout).toContain('Administrator already exists.');
      }
      const login = await payload.login({
        collection: 'users',
        data: {email, password},
      });
      expect(login.user?.id).toBe(user.id);
    } finally {
      await payload.delete({collection: 'users', id: user.id});
    }
  });

  it('connects and reads the migrated schema', async () => {
    const result = await payload.find({collection: 'users', limit: 1});
    expect(result.totalDocs).toBeGreaterThanOrEqual(0);
  });

  it('permits admin operations and denies anonymous user management', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: `integration-${crypto.randomUUID()}@example.test`,
        password: crypto.randomUUID(),
      },
    });
    userId = user.id;
    await expect(
      payload.find({collection: 'users', overrideAccess: false}),
    ).rejects.toThrow();
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: 'unauthorized@example.test',
          password: crypto.randomUUID(),
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow();
    const result = await payload.find({
      collection: 'users',
      user,
      overrideAccess: false,
    });
    expect(result.docs.some((doc) => doc.id === user.id)).toBe(true);
  });

  it('validates images, saves variants, and permits public metadata reads', async () => {
    const data = await sharp({
      create: {width: 1800, height: 1200, channels: 3, background: '#888888'},
    })
      .png()
      .toBuffer();
    const file = {
      data,
      mimetype: 'image/png',
      name: 'integration.png',
      size: data.length,
    };
    await expect(
      payload.create({
        collection: 'media',
        data: {alt: 'Image'},
        file,
        overrideAccess: false,
      }),
    ).rejects.toThrow();
    await expect(
      payload.create({collection: 'media', data: {alt: ''}, file}),
    ).rejects.toThrow();
    const text = Buffer.from('This is a text file, not an image.');
    await expect(
      payload.create({
        collection: 'media',
        data: {alt: 'Invalid'},
        file: {
          data: text,
          size: text.length,
          name: 'invalid.txt',
          mimetype: 'text/plain',
        },
      }),
    ).rejects.toThrow();

    const media = await payload.create({
      collection: 'media',
      data: {alt: 'Integration image'},
      file,
    });
    mediaIds.push(media.id);
    expect(media.sizes?.small?.width).toBe(400);
    expect(media.sizes?.medium?.width).toBe(800);
    expect(media.sizes?.large?.width).toBe(1600);
    const files = await readdir(mediaDir);
    expect(files).toContain(media.filename);
    expect(files).toContain(media.sizes?.small?.filename);
    expect(files).toContain(media.sizes?.medium?.filename);
    expect(files).toContain(media.sizes?.large?.filename);
    const publicMedia = await payload.findByID({
      collection: 'media',
      id: media.id,
      overrideAccess: false,
    });
    expect(publicMedia.alt).toBe('Integration image');
    await expect(
      payload.update({
        collection: 'media',
        id: media.id,
        data: {alt: 'Unauthorized'},
        overrideAccess: false,
      }),
    ).rejects.toThrow();
    await expect(
      payload.delete({
        collection: 'media',
        id: media.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow();
  });
});
