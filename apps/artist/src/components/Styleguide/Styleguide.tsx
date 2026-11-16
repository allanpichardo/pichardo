import {TypographySamples} from './TypographySamples';
import {ColorSamples} from './ColorSamples';
import {SpacingSamples} from './SpacingSamples';
import {ElementSamples} from './ElementSamples';
import {ControlSamples} from './ControlSamples';
import {ContentSamples} from './ContentSamples';
import styles from './Styleguide.module.scss';

const sections = [
  {id: 'typography', title: 'Typography'},
  {id: 'colors', title: 'Colors'},
  {id: 'spacing', title: 'Spacing & layout'},
  {id: 'content-elements', title: 'Content elements'},
  {id: 'controls', title: 'Controls'},
  {id: 'content-blocks', title: 'Content blocks'},
];

export function Styleguide() {
  return (
    <main className={`Styleguide ${styles.Styleguide} u-container`}>
      <header className={styles.intro}>
        <p>
          <small>Allan Pichardo / Artist site</small>
        </p>
        <h1>Styleguide</h1>
        <p>
          A working reference for our typography, palette, and content. These
          samples use the current site styles. Resize the window to see the
          fluid scales respond.
        </p>
        <nav aria-label="Styleguide sections">
          <ol>
            {sections.map(({id, title}) => (
              <li key={id}>
                <a href={`#${id}`}>{title}</a>
              </li>
            ))}
          </ol>
        </nav>
      </header>
      <TypographySamples />
      <ColorSamples />
      <SpacingSamples />
      <ElementSamples />
      <ControlSamples />
      <ContentSamples />
      <footer className={styles.footer}>
        <a href="#">Back to top</a>
        <p>
          <small>End of styleguide / Artist site</small>
        </p>
      </footer>
    </main>
  );
}
