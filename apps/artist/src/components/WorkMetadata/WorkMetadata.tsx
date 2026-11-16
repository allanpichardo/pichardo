import type {Work} from '../../payload-types';
import styles from './WorkMetadata.module.scss';

export function WorkMetadata({
  work,
}: {
  work: Pick<Work, 'category' | 'year' | 'medium' | 'dimensions'>;
}) {
  return (
    <div className={`WorkMetadata ${styles.WorkMetadata}`}>
      {typeof work.category === 'object' && work.category && (
        <p>{work.category.name}</p>
      )}
      <dl>
        {work.year && (
          <>
            <dt>Year</dt>
            <dd>{work.year}</dd>
          </>
        )}
        {work.medium && (
          <>
            <dt>Medium</dt>
            <dd>{work.medium}</dd>
          </>
        )}
        {work.dimensions && (
          <>
            <dt>Dimensions</dt>
            <dd>{work.dimensions}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
