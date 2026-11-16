import type {Post} from '../../payload-types';
import styles from './PostMetadata.module.scss';

export function PostMetadata({publishedAt}: Pick<Post, 'publishedAt'>) {
  return (
    <p className={`PostMetadata ${styles.PostMetadata}`}>
      <time dateTime={publishedAt}>
        {new Date(publishedAt).toLocaleDateString('en-US', {timeZone: 'UTC'})}
      </time>
    </p>
  );
}
