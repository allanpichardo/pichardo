import type {Work, Post} from '../../payload-types';
import styles from './TagList.module.scss';

export function TagList({tags}: {tags: Work['tags'] | Post['tags']}) {
  const resolved =
    tags?.flatMap((tag) => (typeof tag === 'object' ? [tag] : [])) ?? [];
  if (!resolved.length) return null;
  return (
    <ul className={`TagList ${styles.TagList}`} aria-label="Tags">
      {resolved.map((tag) => (
        <li key={tag.id}>{tag.name}</li>
      ))}
    </ul>
  );
}
