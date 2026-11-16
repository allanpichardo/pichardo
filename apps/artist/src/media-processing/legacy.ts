import {createHash, randomUUID} from 'node:crypto';
import {copyFile, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import type {Payload, PayloadRequest} from 'payload';
import {prepareStorage, safeFilename, syncDirectory, syncFile} from './storage';
import {artifactURL} from './types';
import type {Artifact} from './types';

export async function importLegacyMedia(
  payload: Payload,
  req: PayloadRequest,
  root: string,
) {
  const paths = await prepareStorage(root);
  const records = await payload.find({
    collection: 'media',
    where: {
      publishedGeneration: {exists: false},
      requestedGeneration: {exists: false},
    },
    pagination: false,
    limit: 0,
    req,
    overrideAccess: true,
  });
  const previous = req.context;
  req.context = {...req.context, mediaPipeline: true};
  try {
    for (const media of records.docs) {
      if (
        !media.filename ||
        !safeFilename(media.filename) ||
        !media.mimeType?.startsWith('image/')
      )
        throw new Error(`Legacy media ${media.id} is not a supported image.`);
      const original = path.join(root, media.filename);
      const data = await readFile(original);
      const hash = createHash('sha256').update(data).digest('hex');
      const generation = randomUUID();
      const source = path.join(paths.originals, generation);
      await copyFile(original, source);
      await syncFile(source);
      if (
        createHash('sha256')
          .update(await readFile(source))
          .digest('hex') !== hash
      )
        throw new Error('Legacy source copy failed verification.');
      const artifacts: Artifact[] = [
        {
          role: 'primary',
          filename: media.filename,
          mimeType: media.mimeType,
          filesize: data.length,
          width: media.width ?? 1,
          height: media.height ?? 1,
        },
      ];
      for (const role of [
        'small',
        'medium',
        'large',
      ] satisfies Artifact['role'][]) {
        const item = media.sizes?.[role];
        if (item?.filename && safeFilename(item.filename))
          artifacts.push({
            role,
            filename: item.filename,
            mimeType: item.mimeType ?? media.mimeType,
            filesize: (await stat(path.join(root, item.filename))).size,
            width: item.width ?? 1,
            height: item.height ?? 1,
          });
      }
      for (const artifact of artifacts) {
        const destination = path.join(paths.published, artifact.filename);
        await copyFile(path.join(root, artifact.filename), destination);
        await syncFile(destination);
      }
      await syncDirectory(paths.originals);
      await syncDirectory(paths.published);
      await payload.create({
        collection: 'media-generations',
        req,
        data: {
          generation,
          mediaId: media.id,
          sourceKey: generation,
          sourceName: media.filename,
          sourceMimeType: media.mimeType,
          sourceBytes: data.length,
          sourceHash: hash,
          kind: 'image',
          state: 'ready',
          artifacts,
        },
      });
      await payload.update({
        collection: 'media',
        id: media.id,
        req,
        data: {
          requestedGeneration: generation,
          publishedGeneration: generation,
          mediaKind: 'image',
          processingStatus: 'ready',
          thumbnailURL: artifactURL(
            media.sizes?.small?.filename ?? media.filename,
          ),
        },
      });
    }
  } finally {
    req.context = previous;
  }
}
