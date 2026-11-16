import {randomUUID} from 'node:crypto';
import {rm} from 'node:fs/promises';
import path from 'node:path';
import {APIError} from 'payload';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from 'payload';
import type {Media} from '../payload-types';
import {lockMedia} from './database';
import {captureSource} from './ingest';
import {mediaPaths} from './storage';
import {MEDIA_QUEUE} from './types';
import type {Source} from './types';

const uploads = new WeakMap<PayloadRequest, Source>();
const protectedFields = [
  'filename',
  'url',
  'mimeType',
  'filesize',
  'width',
  'height',
  'sizes',
  'mediaKind',
  'processingStatus',
  'processingError',
  'duration',
  'thumbnailURL',
  'video',
  'requestedGeneration',
  'publishedGeneration',
] satisfies (keyof Media)[];
export function ingestHook(root: string): CollectionBeforeOperationHook {
  return async ({args, operation, req, overrideAccess}) => {
    if (
      operation !== 'create' &&
      operation !== 'update' &&
      operation !== 'updateByID'
    )
      return args;
    if (req.context.mediaPipeline) return args;
    if (
      req.query?.uploadEdits ||
      ('duplicateFromID' in args && args.duplicateFromID)
    )
      throw new APIError(
        'Use a new file upload or Reprocess media instead of crop or duplicate.',
        400,
      );
    if (!req.file) return args;
    if (!overrideAccess && !req.user)
      throw new APIError('Authentication is required.', 403);
    const original = req.file;
    const source = await captureSource(req, root);
    uploads.set(req, source);
    req.file = undefined;
    if (original.tempFilePath) await rm(original.tempFilePath, {force: true});
    return args;
  };
}
export const protectMediaFields: CollectionBeforeChangeHook<Media> = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (originalDoc?.id) {
    await lockMedia(req, originalDoc.id);
    originalDoc = await req.payload.findByID({
      collection: 'media',
      id: originalDoc.id,
      req,
      overrideAccess: true,
    });
  }
  if (req.context.mediaPipeline) return data;
  for (const field of protectedFields) {
    if (originalDoc && field in originalDoc)
      data = {...data, [field]: originalDoc[field]};
    else delete data[field];
  }
  const source = uploads.get(req);
  if (source) {
    data.requestedGeneration = source.key;
    data.processingStatus = 'queued';
    data.processingError = null;
    if (!originalDoc?.publishedGeneration) data.mediaKind = source.kind;
  } else if (operation === 'create')
    throw new APIError('Upload a media file.', 400);
  return data;
};
export const queueUploadedMedia: CollectionAfterChangeHook<Media> = async ({
  doc,
  req,
}) => {
  const source = uploads.get(req);
  if (!source) return doc;
  uploads.delete(req);
  const generation = await req.payload.create({
    collection: 'media-generations',
    req,
    data: {
      generation: source.key,
      mediaId: doc.id,
      sourceKey: source.key,
      sourceName: source.name,
      sourceMimeType: source.mimeType,
      sourceBytes: source.filesize,
      sourceHash: source.sha256,
      kind: source.kind,
      state: 'queued',
    },
  });
  await req.payload.jobs.queue({
    task: 'processMedia',
    queue: MEDIA_QUEUE,
    input: {generationId: generation.id},
    req,
  });
  return doc;
};
export const markDeletedMedia: CollectionAfterDeleteHook<Media> = async ({
  id,
  req,
  doc,
}) => {
  await req.payload.update({
    collection: 'media-generations',
    where: {mediaId: {equals: id}},
    data: {state: 'deleted'},
    req,
    overrideAccess: true,
  });
  return doc;
};
export async function reprocessMedia(req: PayloadRequest) {
  if (!req.user)
    return Response.json({error: 'Authentication is required.'}, {status: 403});
  const id = Number(req.routeParams?.id);
  if (!Number.isSafeInteger(id))
    return Response.json({error: 'Invalid media ID.'}, {status: 400});
  await queueReprocess(req, id);
  return Response.json({status: 'queued'});
}
export async function queueReprocess(req: PayloadRequest, id: number) {
  const transaction = await req.payload.db.beginTransaction();
  if (!transaction)
    throw new Error('Media processing requires database transactions.');
  const previous = req.transactionID;
  req.transactionID = transaction;
  const previousContext = req.context;
  req.context = {...req.context, mediaPipeline: true};
  try {
    await lockMedia(req, id);
    const current = await req.payload.findByID({
      collection: 'media',
      id,
      req,
      overrideAccess: true,
    });
    const latest = await req.payload.find({
      collection: 'media-generations',
      where: {
        mediaId: {equals: id},
        generation: {equals: current.requestedGeneration},
      },
      limit: 1,
      overrideAccess: true,
      req,
    });
    const source = latest.docs[0];
    if (!source || source.state === 'deleted')
      throw new APIError('No retained original is available.', 404);
    const generation = randomUUID();
    const record = await req.payload.create({
      collection: 'media-generations',
      req,
      data: {
        generation,
        mediaId: id,
        sourceKey: source.sourceKey,
        sourceName: source.sourceName,
        sourceMimeType: source.sourceMimeType,
        sourceBytes: source.sourceBytes,
        sourceHash: source.sourceHash,
        kind: source.kind,
        state: 'queued',
      },
    });
    await req.payload.update({
      collection: 'media',
      id,
      req,
      data: {
        requestedGeneration: generation,
        processingStatus: 'queued',
        processingError: null,
      },
    });
    await req.payload.jobs.queue({
      task: 'processMedia',
      queue: MEDIA_QUEUE,
      input: {generationId: record.id},
      req,
    });
    await req.payload.db.commitTransaction(transaction);
  } catch (error) {
    await req.payload.db.rollbackTransaction(transaction);
    throw error;
  } finally {
    req.transactionID = previous;
    req.context = previousContext;
  }
}
export async function removeGenerationFiles(
  root: string,
  sourceKey: string,
  filenames: string[],
  removeSource: boolean,
) {
  const paths = mediaPaths(root);
  await Promise.all(
    filenames.map((filename) =>
      rm(path.join(paths.published, filename), {force: true}),
    ),
  );
  if (removeSource)
    await rm(path.join(paths.originals, sourceKey), {force: true});
}
