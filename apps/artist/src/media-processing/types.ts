export const MAX_UPLOAD_BYTES = 50_000_000;
export const MEDIA_QUEUE = 'media';
export const RETIRE_AFTER_MS = 24 * 60 * 60 * 1000;

export type MediaKind = 'image' | 'video';
export type Artifact = {
  role: 'primary' | 'small' | 'medium' | 'large' | 'mp4' | 'poster' | 'preview';
  filename: string;
  mimeType: string;
  filesize: number;
  width: number;
  height: number;
};
export type Renditions = {
  kind: MediaKind;
  duration?: number;
  artifacts: Artifact[];
};
export type Source = {
  key: string;
  name: string;
  mimeType: string;
  filesize: number;
  sha256: string;
  kind: MediaKind;
};
export type Probe = {
  streamIndex: number;
  width: number;
  height: number;
  duration: number;
  fps: number;
  audio: boolean;
  codec: string;
  format: string;
};
export function artifactURL(filename: string) {
  return `/api/media/file/${encodeURIComponent(filename)}`;
}
