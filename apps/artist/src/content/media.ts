import type {Media} from '../payload-types';

export function publicMedia(value: number | Media | null | undefined) {
  return value && typeof value === 'object' && value.url ? value : undefined;
}

export function publicImage(value: number | Media | null | undefined) {
  const media = publicMedia(value);
  return media?.mediaKind === 'image' ? media : undefined;
}
