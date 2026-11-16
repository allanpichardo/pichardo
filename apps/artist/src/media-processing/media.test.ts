import {afterEach, describe, expect, it} from 'vitest';
import {copyFile, mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {chooseSmaller, imageRenditions} from './image';
import {byteRange} from './delivery';
import {previewSegments, probeVideo, videoRenditions} from './video';
import {runProcess} from './process';
import {MAX_UPLOAD_BYTES} from './types';

const directories: string[] = [];
async function temporary() {
  const directory = await mkdtemp(path.join(tmpdir(), 'pichardo-media-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, {recursive: true, force: true})),
  );
});

describe('public media renditions', () => {
  it('chooses WebP only when strictly smaller, including equal-size candidates', () => {
    const original = Buffer.from('1234');
    expect(chooseSmaller(original, Buffer.from('123')).webp).toBe(true);
    expect(chooseSmaller(original, Buffer.from('1234')).data).toBe(original);
    expect(chooseSmaller(original, Buffer.from('12345')).data).toBe(original);
    expect(MAX_UPLOAD_BYTES).toBe(50_000_000);
  });
  it('preserves alpha and never enlarges responsive images', async () => {
    const directory = await temporary();
    const source = path.join(directory, 'input.png');
    await sharp({
      create: {
        width: 64,
        height: 48,
        channels: 4,
        background: {r: 20, g: 30, b: 40, alpha: 0.4},
      },
    })
      .png()
      .toFile(source);
    const result = await imageRenditions(
      source,
      directory,
      'alpha',
      'image/png',
    );
    expect(result.artifacts).toHaveLength(4);
    for (const artifact of result.artifacts) {
      const metadata = await sharp(
        path.join(directory, artifact.filename),
      ).metadata();
      expect(metadata.hasAlpha).toBe(true);
      expect(artifact.width).toBe(64);
      expect(artifact.height).toBe(48);
    }
  });
  it('preserves image orientation for an EXIF-rotated JPEG', async () => {
    const directory = await temporary();
    const source = path.join(directory, 'input.jpg');
    await sharp({
      create: {width: 160, height: 80, channels: 3, background: '#963421'},
    })
      .jpeg()
      .withMetadata({orientation: 6})
      .toFile(source);
    const result = await imageRenditions(
      source,
      directory,
      'oriented',
      'image/jpeg',
    );
    expect(
      result.artifacts.every(
        (artifact) => artifact.width === 80 && artifact.height === 160,
      ),
    ).toBe(true);
  });
  it('preserves animated WebP frames and loop metadata', async () => {
    const directory = await temporary();
    const source = path.join(directory, 'animated.webp');
    await runProcess('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=64x64:rate=5:duration=1',
      '-c:v',
      'libwebp_anim',
      '-loop',
      '0',
      source,
    ]);
    const input = await sharp(source, {animated: true}).metadata();
    const result = await imageRenditions(
      source,
      directory,
      'animated',
      'image/webp',
    );
    for (const artifact of result.artifacts) {
      const metadata = await sharp(path.join(directory, artifact.filename), {
        animated: true,
      }).metadata();
      expect(metadata.pages).toBe(input.pages);
      expect(metadata.loop).toBe(input.loop);
      expect(metadata.delay).toEqual(input.delay);
    }
  });
  it('encodes real video, keeps audio, caps frame rate, and creates a looping animated preview', async () => {
    const directory = await temporary();
    const source = path.join(directory, 'source.mp4');
    await runProcess('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=160x96:rate=60:duration=0.8',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=0.8',
      '-c:v',
      'libx264',
      '-threads',
      '1',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      source,
    ]);
    const result = await videoRenditions(source, directory, 'video');
    expect(result.artifacts.map((artifact) => artifact.role)).toEqual([
      'primary',
      'mp4',
      'poster',
      'preview',
    ]);
    for (const artifact of result.artifacts.filter((item) =>
      item.mimeType.startsWith('video/'),
    )) {
      const metadata = await probeVideo(
        path.join(directory, artifact.filename),
      );
      expect(metadata.codec).toBe(artifact.role === 'primary' ? 'av1' : 'h264');
      expect(metadata.audio).toBe(true);
      expect(metadata.fps).toBeLessThanOrEqual(30.1);
      expect(metadata.width).toBe(160);
      expect(metadata.height).toBe(96);
    }
    const preview = result.artifacts.find(
      (artifact) => artifact.role === 'preview',
    );
    if (!preview) throw new Error('Missing preview');
    const metadata = await sharp(path.join(directory, preview.filename), {
      animated: true,
    }).metadata();
    expect(metadata.pages).toBeGreaterThan(1);
    expect(metadata.loop).toBe(0);
    expect(
      (await stat(path.join(directory, preview.filename))).size,
    ).toBeLessThan(2_000_000);
    expect(
      (await readFile(path.join(directory, preview.filename)))
        .subarray(0, 3)
        .toString(),
    ).toBe('GIF');
  }, 120_000);
  it('downscales real 4K video to the 1080p delivery cap', async () => {
    const directory = await temporary();
    const source = path.join(directory, '4k.mp4');
    await runProcess('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=blue:size=3840x2160:rate=2:duration=1',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-threads',
      '1',
      source,
    ]);
    const result = await videoRenditions(source, directory, 'downscaled');
    for (const artifact of result.artifacts.filter((item) =>
      item.mimeType.startsWith('video/'),
    )) {
      expect(artifact.width).toBe(1920);
      expect(artifact.height).toBe(1080);
      expect(
        (await probeVideo(path.join(directory, artifact.filename))).fps,
      ).toBeLessThanOrEqual(2.1);
    }
  }, 120_000);
  it('creates a six-second GIF from multiple sampled sections of a longer video', async () => {
    const directory = await temporary();
    const source = path.join(directory, 'long.mp4');
    await runProcess('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=160x96:rate=4:duration=7',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-threads',
      '1',
      source,
    ]);
    const result = await videoRenditions(source, directory, 'sampled');
    const preview = result.artifacts.find(
      (artifact) => artifact.role === 'preview',
    );
    if (!preview) throw new Error('Missing sampled preview');
    const metadata = await sharp(path.join(directory, preview.filename), {
      animated: true,
    }).metadata();
    expect(metadata.pages).toBeGreaterThan(30);
    expect(
      metadata.delay?.reduce((total, delay) => total + delay, 0),
    ).toBeGreaterThanOrEqual(5900);
    expect(
      metadata.delay?.reduce((total, delay) => total + delay, 0),
    ).toBeLessThanOrEqual(6100);
  }, 120_000);
  it('keeps portrait video silent and applies rotation metadata', async () => {
    const directory = await temporary();
    const rotated = path.join(directory, 'rotated.mp4');
    await copyFile(
      new URL('../../../../tests/fixtures/rotated.mp4', import.meta.url),
      rotated,
    );
    const result = await videoRenditions(rotated, directory, 'portrait');
    const primary = result.artifacts.find(
      (artifact) => artifact.role === 'primary',
    );
    if (!primary) throw new Error('Missing video');
    expect(primary.width).toBe(96);
    expect(primary.height).toBe(160);
    expect(
      (await probeVideo(path.join(directory, primary.filename))).audio,
    ).toBe(false);
  }, 120_000);
});
describe('delivery and preview boundaries', () => {
  it('handles standard, suffix, open, clipped and invalid byte ranges', () => {
    expect(byteRange(null, 100)).toBeNull();
    expect(byteRange('bytes=10-19', 100)).toEqual({start: 10, end: 19});
    expect(byteRange('bytes=-10', 100)).toEqual({start: 90, end: 99});
    expect(byteRange('bytes=90-', 100)).toEqual({start: 90, end: 99});
    expect(byteRange('bytes=90-200', 100)).toEqual({start: 90, end: 99});
    for (const value of [
      'bytes=100-',
      'bytes=20-10',
      'bytes=-0',
      'bytes=-',
      'bytes=1-2,3-4',
    ])
      expect(byteRange(value, 100)).toBe(false);
  });
  it('samples throughout longer videos and uses only available short-video duration', () => {
    expect(previewSegments(30)).toEqual([
      {start: 3, duration: 2},
      {start: 15, duration: 2},
      {start: 27, duration: 2},
    ]);
    expect(previewSegments(0.5)).toEqual([{start: 0, duration: 0.5}]);
  });
});
