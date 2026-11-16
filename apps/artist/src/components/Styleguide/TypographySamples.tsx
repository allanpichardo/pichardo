import styles from './Styleguide.module.scss';

const headings = [
  {tag: 'h1', token: '--step-5'},
  {tag: 'h2', token: '--step-4'},
  {tag: 'h3', token: '--step-3'},
  {tag: 'h4', token: '--step-2'},
  {tag: 'h5', token: '--step-1'},
  {tag: 'h6', token: '--step-0'},
] satisfies {tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; token: string}[];
const typeSteps = [
  '--step--2',
  '--step--1',
  '--step-0',
  '--step-1',
  '--step-2',
  '--step-3',
  '--step-4',
  '--step-5',
];

export function TypographySamples() {
  return (
    <section
      id="typography"
      aria-labelledby="typography-title"
      className={`TypographySamples ${styles.TypographySamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>01 / Type</small>
        </p>
        <h2 id="typography-title">Typography</h2>
        <p>
          Momo Trust Display for headings. DM Mono for body text, metadata, and
          controls. Both are served locally.
        </p>
      </header>

      <p>
        <small>Momo Trust Display / 400 / line height 1.1</small>
      </p>
      {headings.map(({tag: Heading, token}) => (
        <div className={styles.typeRow} key={Heading}>
          <small>
            <code>
              {Heading} · {token}
            </code>
          </small>
          <Heading>Heading {Heading.slice(1)}</Heading>
        </div>
      ))}

      <h3>Body faces</h3>
      {[300, 400, 500].map((weight) => (
        <div
          key={weight}
          className={styles.faceSample}
          style={{fontWeight: weight}}
        >
          <small>DM Mono / {weight}</small>
          <p>Sound, code, and moving images. 0123456789</p>
          <p>
            <em>Sound, code, and moving images. 0123456789</em>
          </p>
        </div>
      ))}
      <p>
        Body text uses the base step and a line height of 1.6. A longer passage
        helps us judge the rhythm of a page, the space between lines, and the
        texture of a paragraph alongside a large heading.
      </p>
      <p>
        <small>
          Small text and captions use <code>--step--1</code>.
        </small>
      </p>

      <h3>Fluid type scale</h3>
      <p>
        <small>20–24px base / 350–1600px viewport / ratios 1.2–1.25</small>
      </p>
      {typeSteps.map((token) => (
        <div className={styles.typeRow} key={token}>
          <small>
            <code>{token}</code>
          </small>
          <p style={{fontSize: `var(${token})`}}>Aa 0123</p>
        </div>
      ))}
    </section>
  );
}
