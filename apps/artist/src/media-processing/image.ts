import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {Artifact, Renditions} from './types';

export function chooseSmaller(original: Buffer, webp: Buffer) {
  return webp.length < original.length
    ? {data: webp, webp: true}
    : {data: original, webp: false};
}
export async function imageRenditions(
  source: string,
  directory: string,
  generation: string,
  mimeType: string,
): Promise<Renditions> {
  const input = await readFile(source);
  const options = {animated: true, limitInputPixels: 100_000_000};
  const metadata = await sharp(input, options).metadata();
  const width = metadata.autoOrient?.width ?? metadata.width;
  const height =
    metadata.pageHeight ?? metadata.autoOrient?.height ?? metadata.height;
  if (!width || !height) throw new Error('Image dimensions are missing.');
  const extension =
    mimeType === 'image/jpeg'
      ? 'jpg'
      : mimeType === 'image/png'
        ? 'png'
        : 'webp';
  const artifacts: Artifact[] = [];
  const variants: {role: Artifact['role']; width?: number}[] = [
    {role: 'primary'},
    {role: 'small', width: 400},
    {role: 'medium', width: 800},
    {role: 'large', width: 1600},
  ];
  for (const variant of variants) {
    let image = sharp(input, options).rotate();
    if (variant.width)
      image = image.resize({width: variant.width, withoutEnlargement: true});
    const original = variant.width
      ? await image
          .clone()
          .toFormat(extension === 'jpg' ? 'jpeg' : extension)
          .toBuffer()
      : input;
    const candidate = await image.webp({quality: 90}).toBuffer();
    const selected = chooseSmaller(original, candidate);
    const filename = `${generation}-${variant.role}.${selected.webp ? 'webp' : extension}`;
    await writeFile(path.join(directory, filename), selected.data, {
      flag: 'wx',
    });
    const result = await sharp(selected.data, options).metadata();
    artifacts.push({
      role: variant.role,
      filename,
      mimeType: selected.webp ? 'image/webp' : mimeType,
      filesize: selected.data.length,
      width: result.autoOrient?.width ?? result.width ?? width,
      height:
        result.pageHeight ??
        result.autoOrient?.height ??
        result.height ??
        height,
    });
  }
  return {kind: 'image', artifacts};
}
