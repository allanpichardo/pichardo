import type {Work} from '../../payload-types';
import styles from './ContentHeader.module.scss';

export function ContentHeader({
  title,
  summary,
}: Pick<Work, 'title' | 'summary'>) {
  return (
    <header className={`ContentHeader ${styles.ContentHeader}`}>
      <h1>{title}</h1>
      {summary && <p>{summary}</p>}
    </header>
  );
}
