import {readdir, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import type {Payload} from 'payload';
import {cleanWork, mediaPaths} from './storage';
import {removeGenerationFiles} from './lifecycle';
import {RETIRE_AFTER_MS} from './types';

export async function cleanMedia(payload: Payload, root: string) {
  const records = await payload.find({
    collection: 'media-generations',
    limit: 0,
    pagination: false,
  });
  const knownSources = new Set(records.docs.map((record) => record.sourceKey));
  const knownOutputs = new Set(
    records.docs.flatMap(
      (record) => record.artifacts?.map((artifact) => artifact.filename) ?? [],
    ),
  );
  for (const record of records.docs) {
    const deleted = record.state === 'deleted';
    const retired =
      record.retiredAt &&
      Date.now() - Date.parse(record.retiredAt) >= RETIRE_AFTER_MS;
    if (!deleted && !retired) continue;
    await removeGenerationFiles(
      root,
      record.sourceKey,
      record.artifacts?.map((artifact) => artifact.filename) ?? [],
      deleted,
    );
    if (deleted)
      await payload.delete({collection: 'media-generations', id: record.id});
    else if (record.artifacts?.length)
      await payload.update({
        collection: 'media-generations',
        id: record.id,
        data: {artifacts: []},
      });
  }
  const paths = mediaPaths(root);
  for (const [directory, known] of [
    [paths.originals, knownSources],
    [paths.published, knownOutputs],
  ] satisfies [string, Set<string>][]) {
    for (const entry of await readdir(directory)) {
      const filename = path.join(directory, entry);
      if (
        !known.has(entry) &&
        Date.now() - (await stat(filename)).mtimeMs > RETIRE_AFTER_MS
      )
        await rm(filename, {force: true});
    }
  }
  await cleanWork(root);
}
