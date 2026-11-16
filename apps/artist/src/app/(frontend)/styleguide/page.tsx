import type {Metadata} from 'next';
import {ContentBlocks} from '../../../components/ContentBlocks/ContentBlocks';
import {EventDetails} from '../../../components/EventDetails/EventDetails';
import {FormattedText} from '../../../components/FormattedText/FormattedText';
import {MediaFigure} from '../../../components/MediaFigure/MediaFigure';
import {
  allDayEvent,
  embeds,
  fallbackEmbed,
  gallery,
  sampleImage,
  sampleText,
  sampleVideo,
  timedEvent,
} from './fixtures';
import styles from './styleguide.module.scss';

export const metadata: Metadata = {
  title: 'Styleguide | Allan Pichardo',
  description:
    'Typography, colors, elements, and content blocks for the artist site.',
  robots: {index: false, follow: false},
};

const sections = [
  {id: 'typography', title: 'Typography'},
  {id: 'colors', title: 'Colors'},
  {id: 'spacing', title: 'Spacing & layout'},
  {id: 'content-elements', title: 'Content elements'},
  {id: 'controls', title: 'Controls'},
  {id: 'content-blocks', title: 'Content blocks'},
];

const palette = [
  {name: 'Blue', token: '--color-blue', hex: '#4B91DC'},
  {name: 'Purple', token: '--color-purple', hex: '#840277'},
  {name: 'Yellow', token: '--color-yellow', hex: '#F2CF1D'},
  {name: 'Pink', token: '--color-pink', hex: '#EB2F86'},
  {name: 'Navy', token: '--color-navy', hex: '#211959'},
  {name: 'White', token: '--color-white', hex: '#FFFFFF'},
];

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

export default function StyleguidePage() {
  return (
    <main className={`${styles.styleguide} u-container`}>
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

      <section
        id="typography"
        aria-labelledby="typography-title"
        className={styles.section}
      >
        <header className={styles.sectionHeader}>
          <p>
            <small>01 / Type</small>
          </p>
          <h2 id="typography-title">Typography</h2>
          <p>
            Momo Trust Display for headings. DM Mono for body text, metadata,
            and controls. Both are served locally.
          </p>
        </header>
        <div className={styles.specimen}>
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
        </div>
        <div className={styles.specimen}>
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
            Body text uses the base step and a line height of 1.6. A longer
            passage helps us judge the rhythm of a page, the space between
            lines, and the texture of a paragraph alongside a large heading.
          </p>
          <p>
            <small>
              Small text and captions use <code>--step--1</code>.
            </small>
          </p>
        </div>
        <div className={styles.specimen}>
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
        </div>
      </section>

      <section
        id="colors"
        aria-labelledby="colors-title"
        className={styles.section}
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
        <div className={styles.specimen}>
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
        </div>
      </section>

      <section
        id="spacing"
        aria-labelledby="spacing-title"
        className={styles.section}
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
        <div className={styles.columns}>
          {[
            {title: 'Base spaces', tokens: spaces},
            {title: 'Fluid pairs', tokens: spacePairs},
          ].map(({title, tokens}) => (
            <div className={styles.specimen} key={title}>
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
            </div>
          ))}
        </div>
        <div className={styles.specimen}>
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
        </div>
      </section>

      <section
        id="content-elements"
        aria-labelledby="elements-title"
        className={styles.section}
      >
        <header className={styles.sectionHeader}>
          <p>
            <small>04 / HTML</small>
          </p>
          <h2 id="elements-title">Content elements</h2>
          <p>Standard elements, inheriting the shared frontend styles.</p>
        </header>
        <div className={styles.specimen}>
          <h3>Text & emphasis</h3>
          <p>
            A paragraph can contain <strong>strong emphasis</strong>,{' '}
            <em>italic emphasis</em>, <b>bold text</b>, <i>alternate voice</i>,{' '}
            <a href="#content-blocks">an inline link</a>,{' '}
            <mark>marked text</mark>, <del>deleted text</del>, and{' '}
            <ins>inserted text</ins>.
          </p>
          <p>
            Inline <code>code()</code>, a <kbd>Tab</kbd> key,{' '}
            <samp>output</samp>,{' '}
            <abbr title="Neural cellular automata">NCA</abbr>, H<sub>2</sub>O,
            and x<sup>2</sup>.
          </p>
          <p>
            <small>A short note in small text.</small>
          </p>
          <hr />
          <blockquote>
            <p>Repeat a simple instruction and watch what happens.</p>
            <cite>Sample quotation</cite>
          </blockquote>
        </div>
        <div className={styles.columns}>
          <div className={styles.specimen}>
            <h3>Lists</h3>
            <ul>
              <li>Sound experiments</li>
              <li>
                Visual studies
                <ul>
                  <li>Color systems</li>
                  <li>Moving images</li>
                </ul>
              </li>
              <li>Software</li>
            </ul>
            <ol>
              <li>Set an initial state.</li>
              <li>
                Apply a rule.
                <ol>
                  <li>Observe the result.</li>
                  <li>Repeat.</li>
                </ol>
              </li>
              <li>Record the changes.</li>
            </ol>
          </div>
          <div className={styles.specimen}>
            <h3>Definitions & details</h3>
            <dl>
              <dt>Medium</dt>
              <dd>Generative software, sound</dd>
              <dt>Duration</dt>
              <dd>Variable</dd>
            </dl>
            <p>
              <time dateTime="2026-11-15">November 15, 2026</time>
            </p>
            <address>
              Sample studio
              <br />
              Los Angeles, California
              <br />
              <a href="mailto:studio@example.com">studio@example.com</a>
            </address>
            <details>
              <summary>Additional information</summary>
              <p>
                A native disclosure element. Open and close it to review its
                default appearance.
              </p>
            </details>
          </div>
        </div>
        <div className={styles.specimen}>
          <h3>Code & table</h3>
          <pre>
            <code>{'const next = cells.map(applyRule);\nrender(next);'}</code>
          </pre>
          <div
            className={styles.tableScroll}
            tabIndex={0}
            role="region"
            aria-label="Sample work table"
          >
            <table>
              <caption>Sample work specifications</caption>
              <thead>
                <tr>
                  <th scope="col">Study</th>
                  <th scope="col">Medium</th>
                  <th scope="col">Year</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Field notes</th>
                  <td>Generative software</td>
                  <td>2026</td>
                </tr>
                <tr>
                  <th scope="row">Listening room</th>
                  <td>Sound installation</td>
                  <td>2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className={styles.specimen}>
          <h3>Figure & caption</h3>
          <MediaFigure
            value={sampleImage}
            caption="A figure with a caption. The artwork is bundled with the styleguide."
          />
        </div>
      </section>

      <section
        id="controls"
        aria-labelledby="controls-title"
        className={styles.section}
      >
        <header className={styles.sectionHeader}>
          <p>
            <small>05 / Inputs</small>
          </p>
          <h2 id="controls-title">Controls</h2>
          <p>
            Native controls with inherited typography. These samples do not
            submit anything.
          </p>
        </header>
        <div className={styles.specimen}>
          <div className={styles.fields}>
            <label>
              Text
              <input type="text" placeholder="Study title" />
            </label>
            <label>
              Email
              <input type="email" placeholder="studio@example.com" />
            </label>
            <label>
              Search
              <input type="search" placeholder="Search works" />
            </label>
            <label>
              Number
              <input type="number" defaultValue={12} />
            </label>
            <label>
              Date
              <input type="date" defaultValue="2026-11-15" />
            </label>
            <label>
              Medium
              <select defaultValue="software">
                <option value="software">Software</option>
                <option value="sound">Sound</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label>
              Disabled input
              <input type="text" defaultValue="Unavailable" disabled />
            </label>
            <label>
              Read-only input
              <input type="text" defaultValue="Read only" readOnly />
            </label>
            <label>
              Range
              <input type="range" min="0" max="100" defaultValue="40" />
            </label>
          </div>
          <label className={styles.textareaLabel}>
            Notes
            <textarea rows={4} placeholder="Describe the work…" />
          </label>
          <div className={styles.choices}>
            <fieldset>
              <legend>Checkboxes</legend>
              <label>
                <input type="checkbox" defaultChecked /> Include captions
              </label>
              <label>
                <input type="checkbox" /> Show metadata
              </label>
              <label>
                <input type="checkbox" disabled /> Unavailable
              </label>
            </fieldset>
            <fieldset>
              <legend>Radio buttons</legend>
              <label>
                <input
                  type="radio"
                  name="sample-format"
                  value="image"
                  defaultChecked
                />{' '}
                Image
              </label>
              <label>
                <input type="radio" name="sample-format" value="video" /> Video
              </label>
              <label>
                <input
                  type="radio"
                  name="sample-format"
                  value="audio"
                  disabled
                />{' '}
                Audio unavailable
              </label>
            </fieldset>
          </div>
          <div className={styles.actions}>
            <button type="button">Sample button</button>
            <button type="button" disabled>
              Disabled button
            </button>
            <a href="#content-blocks">Text action</a>
          </div>
        </div>
      </section>

      <section
        id="content-blocks"
        aria-labelledby="blocks-title"
        className={styles.section}
      >
        <header className={styles.sectionHeader}>
          <p>
            <small>06 / Content</small>
          </p>
          <h2 id="blocks-title">Content blocks</h2>
          <p>
            Fixed sample content passed through the public-site renderers.
            Artwork, titles, and events below are examples.
          </p>
        </header>
        <div className={styles.specimen}>
          <h3>Rich text</h3>
          <FormattedText data={sampleText} />
        </div>
        <div className={styles.specimen}>
          <h3>Image block</h3>
          <ContentBlocks
            blocks={[
              {
                blockType: 'media',
                media: sampleImage,
                caption: 'Shape and field / Image block with caption.',
              },
            ]}
          />
        </div>
        <div className={styles.specimen}>
          <h3>Video block</h3>
          <MediaFigure
            value={sampleVideo}
            caption="Motion study / A silent three-second local video. Press play to preview."
          />
        </div>
        <div className={styles.specimen}>
          <h3>Gallery block</h3>
          <ContentBlocks blocks={gallery} />
        </div>
        <div className={styles.specimen}>
          <h3>Embeds</h3>
          <p>
            <small>
              Live third-party players. Availability and controls depend on each
              provider.
            </small>
          </p>
          <div className={styles.columns}>
            {embeds.map(({provider, block}) => (
              <div key={provider}>
                <h4>{provider}</h4>
                <ContentBlocks blocks={[block]} />
                <small>
                  <a href={block.url}>Open sample on {provider}</a>
                </small>
              </div>
            ))}
          </div>
          <h4>Link fallback</h4>
          <ContentBlocks blocks={fallbackEmbed} />
        </div>
        <div className={styles.columns}>
          <article className={styles.specimen}>
            <h3>Work metadata</h3>
            <h4>Field notes</h4>
            <p>A sample description of a generative installation.</p>
            <p>Installation</p>
            <dl>
              <dt>Year</dt>
              <dd>2026</dd>
              <dt>Medium</dt>
              <dd>Software, projection, sound</dd>
              <dt>Dimensions</dt>
              <dd>Variable</dd>
            </dl>
            <ul aria-label="Sample work tags">
              <li>Generative systems</li>
              <li>Sound</li>
            </ul>
          </article>
          <article className={styles.specimen}>
            <h3>Post metadata</h3>
            <h4>Notes on repetition</h4>
            <p>
              <time dateTime="2026-11-15T00:00:00Z">11/15/2026</time>
            </p>
            <FormattedText data={sampleText} />
            <ul aria-label="Sample post tags">
              <li>Process</li>
              <li>Studio notes</li>
            </ul>
          </article>
        </div>
        <div className={styles.columns}>
          <article className={styles.specimen}>
            <h3>Timed event</h3>
            <h4>{timedEvent.title}</h4>
            <EventDetails event={timedEvent} />
          </article>
          <article className={styles.specimen}>
            <h3>All-day event</h3>
            <h4>{allDayEvent.title}</h4>
            <EventDetails event={allDayEvent} />
          </article>
        </div>
      </section>
      <footer className={styles.footer}>
        <a href="#">Back to top</a>
        <p>
          <small>End of styleguide / Artist site</small>
        </p>
      </footer>
    </main>
  );
}
