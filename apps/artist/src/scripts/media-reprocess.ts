import {createLocalReq, getPayload} from 'payload';
import config from '../payload.config';
import {queueReprocess} from '../media-processing/lifecycle';

const payload = await getPayload({config});
try {
  const id = process.env.MEDIA_ID ? Number(process.env.MEDIA_ID) : undefined;
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
    throw new Error(
      'MEDIA_ID must be an integer. Omit it to reprocess all retained media.',
    );
  const req = await createLocalReq({context: {mediaPipeline: true}}, payload);
  const media = await payload.find({
    collection: 'media',
    ...(id !== undefined ? {where: {id: {equals: id}}} : {}),
    pagination: false,
    limit: 0,
  });
  if (id !== undefined && media.docs.length === 0)
    throw new Error(`Media ${id} does not exist.`);
  for (const item of media.docs) await queueReprocess(req, item.id);
  payload.logger.info(`Queued ${media.docs.length} media records.`);
} finally {
  await payload.destroy();
}
