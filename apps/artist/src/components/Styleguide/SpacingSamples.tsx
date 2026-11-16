import {Fragment} from 'react';
import styles from './Styleguide.module.scss';

const spaces = ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
const spacePairs = [
  '3xs-2xs',
  '2xs-xs',
  'xs-s',
  's-m',
  'm-l',
  'l-xl',
  'xl-2xl',
  '2xl-3xl',
  's-l',
];

export function SpacingSamples() {
  return (
    <section
      id="spacing"
      aria-labelledby="spacing-title"
      className={`SpacingSamples ${styles.SpacingSamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>03 / Structure</small>
        </p>
        <h2 id="spacing-title">Spacing & layout</h2>
        <p>
          Fluid spaces use the same viewport range as the type scale. The bars
          show their current width.
        </p>
      </header>

      {[
        {title: 'Base spaces', tokens: spaces},
        {title: 'Fluid pairs', tokens: spacePairs},
      ].map(({title, tokens}) => (
        <Fragment key={title}>
          <h3>{title}</h3>
          {tokens.map((space) => (
            <div className={styles.spaceRow} key={space}>
              <small>
                <code>--space-{space}</code>
              </small>
              <div
                className={styles.spaceBar}
                style={{width: `var(--space-${space})`}}
              />
            </div>
          ))}
        </Fragment>
      ))}

      <h3>Container & grid</h3>
      <p>
        This page uses <code>u-container</code>: a 93rem maximum width with
        fluid gutters. Below is <code>u-grid</code> with 12 equal columns.
      </p>
      <div
        className={`${styles.gridSample} u-grid`}
        aria-label="12-column layout sample"
      >
        {Array.from({length: 12}, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <small>
        <code>--grid-max-width</code> / <code>--grid-gutter</code> /{' '}
        <code>--grid-columns</code>
      </small>
    </section>
  );
}
