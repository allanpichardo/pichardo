import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import type {PayloadRequest} from 'payload';
import {mediaPaths, safeFilename} from './storage';
import {RETIRE_AFTER_MS} from './types';

export function byteRange(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end = match[1]
    ? match[2]
      ? Math.min(size - 1, Number(match[2]))
      : size - 1
    : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    return false;
  return {start, end};
}
export async function deliverMedia(
  req: PayloadRequest,
  filename: string,
  root: string,
): Promise<Response> {
  if (!safeFilename(filename)) return new Response(null, {status: 404});
  const result = await req.payload.find({
    collection: 'media-generations',
    where: {'artifacts.filename': {equals: filename}},
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const generation = result.docs[0];
  const artifact = generation?.artifacts?.find(
    (item) => item.filename === filename,
  );
  if (
    !generation ||
    !artifact ||
    generation.state !== 'ready' ||
    (generation.retiredAt &&
      Date.now() - Date.parse(generation.retiredAt) >= RETIRE_AFTER_MS)
  )
    return new Response(null, {status: 404});
  const media = await req.payload.find({
    collection: 'media',
    where: {id: {equals: generation.mediaId}},
    limit: 1,
    overrideAccess: true,
    depth: 0,
  });
  if (!media.docs[0]) return new Response(null, {status: 404});
  const filePath = path.join(mediaPaths(root).published, filename);
  const info = await stat(filePath).catch(() => null);
  if (!info || !info.isFile() || info.size !== artifact.filesize)
    return new Response(null, {status: 404});
  const headers = new Headers({
    'Content-Type': artifact.mimeType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  const range = byteRange(req.headers.get('range'), info.size);
  if (range === false) {
    headers.set('Content-Range', `bytes */${info.size}`);
    return new Response(null, {status: 416, headers});
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? info.size - 1;
  headers.set('Content-Length', String(end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${info.size}`);
  if (req.method === 'HEAD')
    return new Response(null, {status: range ? 206 : 200, headers});
  const file = createReadStream(filePath, {start, end});
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      file.on('data', (chunk: Buffer | string) => {
        file.pause();
        controller.enqueue(
          typeof chunk === 'string' ? Buffer.from(chunk) : chunk,
        );
      });
      file.on('end', () => controller.close());
      file.on('error', (error) => controller.error(error));
    },
    pull() {
      file.resume();
    },
    cancel() {
      file.destroy();
    },
  });
  return new Response(stream, {status: range ? 206 : 200, headers});
}
