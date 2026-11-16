import {stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {runProcess} from './process';
import type {Artifact, Probe, Renditions} from './types';

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid video metadata.');
  return Object.fromEntries(Object.entries(value));
}
function number(value: unknown) {
  const result =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(result))
    throw new Error('Invalid numeric video metadata.');
  return result;
}
export async function probeVideo(filename: string): Promise<Probe> {
  const parsed: unknown = JSON.parse(
    await runProcess(
      'ffprobe',
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file,pipe',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        filename,
      ],
      30_000,
    ),
  );
  const result = object(parsed);
  if (!Array.isArray(result.streams)) throw new Error('No video streams.');
  const streams = result.streams.map(object);
  const video = streams.find(
    (stream) =>
      stream.codec_type === 'video' &&
      !object(stream.disposition ?? {}).attached_pic,
  );
  if (!video) throw new Error('A real video stream is required.');
  const format = object(result.format);
  const width = number(video.width);
  const height = number(video.height);
  const duration = number(format.duration ?? video.duration);
  const rate =
    typeof video.avg_frame_rate === 'string'
      ? video.avg_frame_rate.split('/').map(Number)
      : [30, 1];
  const fps = rate[1] ? (rate[0] ?? 30) / rate[1] : 30;
  if (width < 1 || height < 1 || width * height > 100_000_000 || duration <= 0)
    throw new Error('Unsupported video dimensions or duration.');
  return {
    streamIndex: number(video.index),
    width,
    height,
    duration,
    fps: fps > 0 ? fps : 30,
    audio: streams.some((stream) => stream.codec_type === 'audio'),
    codec: String(video.codec_name),
    format: String(format.format_name),
  };
}
export function previewSegments(duration: number) {
  if (duration <= 6) return [{start: 0, duration}];
  return [0.1, 0.5, 0.9].map((fraction) => ({
    start: Math.min(duration - 2, duration * fraction),
    duration: 2,
  }));
}
const ffmpeg = (args: string[]) =>
  runProcess('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-protocol_whitelist',
    'file,pipe',
    ...args,
  ]);
export async function videoRenditions(
  source: string,
  directory: string,
  generation: string,
): Promise<Renditions> {
  const input = await probeVideo(source);
  const fps = Math.min(30, input.fps);
  const scale = `scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,fps=${fps}`;
  const webm = `${generation}-primary.webm`;
  const mp4 = `${generation}-mp4.mp4`;
  const common = [
    '-i',
    source,
    '-map',
    `0:${input.streamIndex}`,
    '-map',
    '0:a:0?',
    '-vf',
    scale,
    '-map_metadata',
    '-1',
    '-sn',
    '-dn',
  ];
  await ffmpeg([
    ...common,
    '-c:v',
    'libsvtav1',
    '-crf',
    '30',
    '-preset',
    '6',
    '-svtav1-params',
    'lp=2',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'libopus',
    '-b:a',
    '128k',
    path.join(directory, webm),
  ]);
  await ffmpeg([
    ...common,
    '-c:v',
    'libx264',
    '-crf',
    '23',
    '-preset',
    'medium',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    path.join(directory, mp4),
  ]);
  const artifacts: Artifact[] = [];
  for (const output of [
    {filename: webm, role: 'primary', mimeType: 'video/webm', codec: 'av1'},
    {filename: mp4, role: 'mp4', mimeType: 'video/mp4', codec: 'h264'},
  ] satisfies {
    filename: string;
    role: Artifact['role'];
    mimeType: string;
    codec: string;
  }[]) {
    const filename = path.join(directory, output.filename);
    const metadata = await probeVideo(filename);
    if (
      metadata.codec !== output.codec ||
      metadata.width > 1920 ||
      metadata.height > 1080 ||
      metadata.fps > 30.1 ||
      metadata.audio !== input.audio ||
      Math.abs(metadata.duration - input.duration) > 1
    )
      throw new Error('Video output validation failed.');
    artifacts.push({
      role: output.role,
      filename: output.filename,
      mimeType: output.mimeType,
      filesize: (await stat(filename)).size,
      width: metadata.width,
      height: metadata.height,
    });
  }
  const poster = `${generation}-poster.webp`;
  await ffmpeg([
    '-ss',
    String(Math.min(input.duration / 2, input.duration - 0.01)),
    '-i',
    source,
    '-map',
    `0:${input.streamIndex}`,
    '-frames:v',
    '1',
    '-vf',
    "scale=w='min(640,iw)':h='min(640,ih)':force_original_aspect_ratio=decrease",
    '-c:v',
    'libwebp',
    '-quality',
    '90',
    path.join(directory, poster),
  ]);
  const posterMeta = await sharp(path.join(directory, poster)).metadata();
  artifacts.push({
    role: 'poster',
    filename: poster,
    mimeType: 'image/webp',
    filesize: (await stat(path.join(directory, poster))).size,
    width: posterMeta.width ?? 1,
    height: posterMeta.height ?? 1,
  });
  const preview = `${generation}-preview.gif`;
  for (const settings of [
    {width: 320, fps: 8},
    {width: 240, fps: 6},
    {width: 160, fps: 4},
  ]) {
    const segments = previewSegments(input.duration);
    const filters = segments.map(
      (segment, index) =>
        `[0:${input.streamIndex}]trim=start=${segment.start}:duration=${segment.duration},setpts=PTS-STARTPTS[s${index}]`,
    );
    const joined = segments.map((_, index) => `[s${index}]`).join('');
    filters.push(
      `${joined}concat=n=${segments.length}:v=1:a=0,fps=${settings.fps},scale=w='min(${settings.width},iw)':h='min(${settings.width},ih)':force_original_aspect_ratio=decrease,split[a][b]`,
      '[a]palettegen=max_colors=128[p]',
      '[b][p]paletteuse=dither=bayer[out]',
    );
    await ffmpeg([
      '-i',
      source,
      '-filter_complex_threads',
      '1',
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-an',
      '-loop',
      '0',
      path.join(directory, preview),
    ]);
    if ((await stat(path.join(directory, preview))).size < 2_000_000) break;
  }
  const previewMeta = await sharp(path.join(directory, preview), {
    animated: true,
  }).metadata();
  const previewBytes = (await stat(path.join(directory, preview))).size;
  if (previewBytes >= 2_000_000 || !previewMeta.pages || previewMeta.pages < 1)
    throw new Error('Preview output validation failed.');
  artifacts.push({
    role: 'preview',
    filename: preview,
    mimeType: 'image/gif',
    filesize: previewBytes,
    width: previewMeta.width ?? 1,
    height: previewMeta.pageHeight ?? previewMeta.height ?? 1,
  });
  return {kind: 'video', duration: input.duration, artifacts};
}
