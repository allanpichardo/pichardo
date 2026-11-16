import {createLocalReq} from 'payload';
import type {Payload, TaskConfig} from 'payload';
import {mkdir, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {lockMedia, withMediaTransaction} from './database';
import {imageRenditions} from './image';
import {videoRenditions} from './video';
import {assertWorkerActive} from './process';
import {prepareStorage, syncDirectory, syncFile} from './storage';
import {artifactURL} from './types';
import type {Artifact} from './types';

export async function processMedia(
  payload: Payload,
  root: string,
  generationId: number,
) {
  const generation = (
    await payload.find({
      collection: 'media-generations',
      where: {id: {equals: generationId}},
      depth: 0,
      limit: 1,
    })
  ).docs[0];
  if (
    !generation ||
    generation.state === 'ready' ||
    generation.state === 'deleted'
  )
    return;
  const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
  const paths = await prepareStorage(root);
  const work = path.join(
    paths.work,
    `${generation.generation}-${randomUUID()}`,
  );
  let artifacts: Artifact[] = [];
  let published = false;
  let claimed = false;
  await withMediaTransaction(req, async () => {
    await lockMedia(req, generation.mediaId);
    const current = (
      await payload.find({
        collection: 'media',
        where: {id: {equals: generation.mediaId}},
        limit: 1,
        req,
      })
    ).docs[0];
    const retained = (
      await payload.find({
        collection: 'media-generations',
        where: {id: {equals: generation.id}},
        limit: 1,
        req,
      })
    ).docs[0];
    if (
      !current ||
      current.requestedGeneration !== generation.generation ||
      !retained ||
      retained.state === 'deleted' ||
      retained.state === 'ready'
    )
      return;
    await payload.update({
      collection: 'media-generations',
      id: generation.id,
      data: {state: 'processing'},
      req,
    });
    await payload.update({
      collection: 'media',
      id: generation.mediaId,
      data: {processingStatus: 'processing'},
      req,
    });
    claimed = true;
  });
  if (!claimed) return;
  await mkdir(work, {recursive: true});
  try {
    const source = path.join(paths.originals, generation.sourceKey);
    const output =
      generation.kind === 'image'
        ? await imageRenditions(
            source,
            work,
            generation.generation,
            generation.sourceMimeType,
          )
        : await videoRenditions(source, work, generation.generation);
    artifacts = output.artifacts;
    for (const artifact of artifacts) {
      await syncFile(path.join(work, artifact.filename));
      await rename(
        path.join(work, artifact.filename),
        path.join(paths.published, artifact.filename),
      );
    }
    await syncDirectory(paths.published);
    await assertWorkerActive();
    await withMediaTransaction(req, async () => {
      await lockMedia(req, generation.mediaId);
      await assertWorkerActive();
      const latest = await payload.find({
        collection: 'media',
        where: {id: {equals: generation.mediaId}},
        limit: 1,
        req,
      });
      const media = latest.docs[0];
      if (!media || media.requestedGeneration !== generation.generation) return;
      const primary = artifacts.find((artifact) => artifact.role === 'primary');
      if (!primary) throw new Error('Primary media output is missing.');
      const describe = (role: Artifact['role']) => {
        const item = artifacts.find((artifact) => artifact.role === role);
        return item ? {...item, url: artifactURL(item.filename)} : undefined;
      };
      if (media.publishedGeneration)
        await payload.update({
          collection: 'media-generations',
          where: {generation: {equals: media.publishedGeneration}},
          data: {retiredAt: new Date().toISOString()},
          req,
        });
      await payload.update({
        collection: 'media-generations',
        id: generation.id,
        data: {state: 'ready', artifacts},
        req,
      });
      await payload.update({
        collection: 'media',
        id: media.id,
        req,
        data: {
          filename: primary.filename,
          mimeType: primary.mimeType,
          filesize: primary.filesize,
          width: primary.width,
          height: primary.height,
          sizes: {
            small: describe('small') ?? {},
            medium: describe('medium') ?? {},
            large: describe('large') ?? {},
          },
          mediaKind: output.kind,
          processingStatus: 'ready',
          processingError: null,
          duration: output.duration ?? null,
          video:
            output.kind === 'video'
              ? {
                  webm: describe('primary'),
                  mp4: describe('mp4'),
                  poster: describe('poster'),
                  preview: describe('preview'),
                }
              : {},
          publishedGeneration: generation.generation,
          thumbnailURL: artifactURL(
            (
              artifacts.find(
                (artifact) =>
                  artifact.role ===
                  (output.kind === 'video' ? 'poster' : 'small'),
              ) ?? primary
            ).filename,
          ),
        },
      });
      published = true;
    });
  } catch (error) {
    payload.logger.error(
      {
        err: error,
        mediaId: generation.mediaId,
        generation: generation.generation,
      },
      'Media processing failed',
    );
    await withMediaTransaction(req, async () => {
      await lockMedia(req, generation.mediaId);
      const retained = await payload.findByID({
        collection: 'media-generations',
        id: generation.id,
        req,
      });
      if (retained.state !== 'deleted')
        await payload.update({
          collection: 'media-generations',
          id: generation.id,
          data: {state: 'failed'},
          req,
        });
      const result = await payload.find({
        collection: 'media',
        where: {
          id: {equals: generation.mediaId},
          requestedGeneration: {equals: generation.generation},
        },
        limit: 1,
        req,
      });
      if (result.docs[0])
        await payload.update({
          collection: 'media',
          id: generation.mediaId,
          data: {
            processingStatus: 'failed',
            processingError:
              'Processing failed. Retry with Reprocess media. Your original is retained.',
          },
          req,
        });
    });
    throw error;
  } finally {
    if (!published)
      await Promise.all(
        artifacts.map((artifact) =>
          rm(path.join(paths.published, artifact.filename), {force: true}),
        ),
      );
    await rm(work, {recursive: true, force: true});
  }
}
export function mediaTask(root: string): TaskConfig<'processMedia'> {
  return {
    slug: 'processMedia',
    inputSchema: [{name: 'generationId', type: 'number', required: true}],
    retries: {attempts: 2, backoff: {type: 'exponential', delay: 30_000}},
    handler: async ({input, req}) => {
      await processMedia(req.payload, root, input.generationId);
      return {output: {}};
    },
  };
}
