import styles from './Styleguide.module.scss';

const palette = [
  {name: 'Blue', token: '--color-blue', hex: '#4B91DC'},
  {name: 'Purple', token: '--color-purple', hex: '#840277'},
  {name: 'Yellow', token: '--color-yellow', hex: '#F2CF1D'},
  {name: 'Pink', token: '--color-pink', hex: '#EB2F86'},
  {name: 'Navy', token: '--color-navy', hex: '#211959'},
  {name: 'White', token: '--color-white', hex: '#FFFFFF'},
];

export function ColorSamples() {
  return (
    <section
      id="colors"
      aria-labelledby="colors-title"
      className={`ColorSamples ${styles.ColorSamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>02 / Palette</small>
        </p>
        <h2 id="colors-title">Colors</h2>
        <p>The six palette colors and the roles they currently play.</p>
      </header>
      <div className={styles.swatches}>
        {palette.map(({name, token, hex}) => (
          <figure key={token}>
            <div
              className={styles.swatch}
              style={{backgroundColor: `var(${token})`}}
            />
            <figcaption>
              <strong>{name}</strong>
              <br />
              <code>{token}</code>
              <br />
              {hex}
            </figcaption>
          </figure>
        ))}
      </div>

      <h3>Semantic colors</h3>
      <p>
        The page uses <code>--color-background</code> and{' '}
        <code>--color-text</code>.
      </p>
      <p>
        <a href="#content-elements">
          This link uses --color-link. Hover to see --color-link-hover.
        </a>
      </p>
      <p>
        <a href="#controls">Tab to this link to inspect --color-focus.</a>
      </p>
      <p>Select some of this text to see the live selection colors.</p>
      <p>
        <span className={styles.selectionSample}>
          Selection sample: navy on yellow.
        </span>
      </p>
      <small>
        <code>--color-selection-background</code> /{' '}
        <code>--color-selection-text</code>
      </small>
    </section>
  );
}
