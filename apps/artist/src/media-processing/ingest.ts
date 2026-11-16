import {createHash, randomUUID} from 'node:crypto';
import {
  copyFile,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {APIError} from 'payload';
import type {PayloadRequest} from 'payload';
import {prepareStorage, syncDirectory, syncFile} from './storage';
import {probeVideo} from './video';
import {MAX_UPLOAD_BYTES} from './types';
import type {Source} from './types';

export async function captureSource(
  req: PayloadRequest,
  root: string,
): Promise<Source> {
  const file = req.file;
  if (!file) throw new APIError('Upload a media file.', 400);
  const paths = await prepareStorage(root);
  const filesize = file.tempFilePath
    ? (await stat(file.tempFilePath)).size
    : file.data.length;
  if (filesize < 1 || filesize > MAX_UPLOAD_BYTES)
    throw new APIError('Files must be between 1 byte and 50 MB.', 400);
  const generation = randomUUID();
  const temporary = path.join(paths.work, `${generation}.upload`);
  try {
    if (file.tempFilePath) await copyFile(file.tempFilePath, temporary);
    else await writeFile(temporary, file.data, {flag: 'wx', mode: 0o600});
    const signature = (await readFile(temporary)).subarray(0, 32);
    let mimeType: string;
    let kind: Source['kind'];
    if (
      signature.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
      signature
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      (signature.toString('ascii', 0, 4) === 'RIFF' &&
        signature.toString('ascii', 8, 12) === 'WEBP')
    ) {
      const metadata = await sharp(temporary, {
        animated: true,
        limitInputPixels: 100_000_000,
      }).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
        throw new Error('Unsupported image.');
      await sharp(temporary, {
        animated: true,
        limitInputPixels: 100_000_000,
      }).stats();
      mimeType = `image/${metadata.format}`;
      kind = 'image';
    } else {
      const iso =
        signature.toString('ascii', 4, 8) === 'ftyp' ||
        signature.toString('ascii', 4, 8) === 'wide' ||
        signature.toString('ascii', 4, 8) === 'mdat';
      const webm = signature
        .subarray(0, 4)
        .equals(Buffer.from([26, 69, 223, 163]));
      if (!iso && !webm) throw new Error('Unsupported file signature.');
      const metadata = await probeVideo(temporary);
      if (
        !metadata.format
          .split(',')
          .some((name) => ['mov', 'mp4', 'webm'].includes(name))
      )
        throw new Error('Unsupported video container.');
      mimeType = webm
        ? 'video/webm'
        : signature.toString('ascii', 8, 12).startsWith('qt')
          ? 'video/quicktime'
          : 'video/mp4';
      kind = 'video';
    }
    const source = {
      key: generation,
      name: path.basename(file.name),
      mimeType,
      filesize,
      sha256: createHash('sha256')
        .update(await readFile(temporary))
        .digest('hex'),
      kind,
    };
    await syncFile(temporary);
    await rename(temporary, path.join(paths.originals, generation));
    await syncDirectory(paths.originals);
    return source;
  } catch (error) {
    if (error instanceof APIError) throw error;
    req.payload.logger.warn({err: error}, 'Media source validation failed');
    throw new APIError(
      'The file is not a supported, readable image or video.',
      400,
    );
  } finally {
    await rm(temporary, {force: true});
  }
}
