import {mkdir, open, readdir, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {RETIRE_AFTER_MS} from './types';

export function mediaPaths(root: string) {
  return {
    root,
    originals: path.join(root, 'originals'),
    work: path.join(root, 'work'),
    published: path.join(root, 'published'),
    unused: path.join(root, 'payload-unused'),
  };
}
export async function prepareStorage(root: string) {
  const paths = mediaPaths(root);
  await Promise.all(
    [paths.originals, paths.work, paths.published, paths.unused].map((dir) =>
      mkdir(dir, {recursive: true, mode: 0o750}),
    ),
  );
  return paths;
}
export async function syncFile(filename: string) {
  const handle = await open(filename, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
export function safeFilename(filename: string) {
  return (
    filename.length > 0 &&
    filename === path.basename(filename) &&
    !filename.includes('\\') &&
    !filename.includes('\0')
  );
}
export async function cleanWork(root: string) {
  const directory = mediaPaths(root).work;
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (Date.now() - (await stat(filename)).mtimeMs > RETIRE_AFTER_MS)
      await rm(filename, {recursive: true, force: true});
  }
}

export async function syncDirectory(directory: string) {
  const handle = await open(directory, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
