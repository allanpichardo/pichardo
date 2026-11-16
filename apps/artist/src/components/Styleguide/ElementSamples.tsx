import {MediaFigure} from '../MediaFigure/MediaFigure';
import {sampleImage} from './fixtures';
import styles from './Styleguide.module.scss';

export function ElementSamples() {
  return (
    <section
      id="content-elements"
      aria-labelledby="elements-title"
      className={`ElementSamples ${styles.ElementSamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>04 / HTML</small>
        </p>
        <h2 id="elements-title">Content elements</h2>
        <p>Standard elements, inheriting the shared frontend styles.</p>
      </header>

      <h3>Text & emphasis</h3>
      <p>
        A paragraph can contain <strong>strong emphasis</strong>,{' '}
        <em>italic emphasis</em>, <b>bold text</b>, <i>alternate voice</i>,{' '}
        <a href="#content-blocks">an inline link</a>, <mark>marked text</mark>,{' '}
        <del>deleted text</del>, and <ins>inserted text</ins>.
      </p>
      <p>
        Inline <code>code()</code>, a <kbd>Tab</kbd> key, <samp>output</samp>,{' '}
        <abbr title="Neural cellular automata">NCA</abbr>, H<sub>2</sub>O, and x
        <sup>2</sup>.
      </p>
      <p>
        <small>A short note in small text.</small>
      </p>
      <hr />
      <blockquote>
        <p>Repeat a simple instruction and watch what happens.</p>
        <cite>Sample quotation</cite>
      </blockquote>

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
          A native disclosure element. Open and close it to review its default
          appearance.
        </p>
      </details>

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

      <h3>Figure & caption</h3>
      <MediaFigure
        value={sampleImage}
        aspectRatio="fit"
        caption="fit / Natural image proportions. The artwork is bundled with the styleguide."
      />
      <MediaFigure
        value={sampleImage}
        aspectRatio="5:4"
        caption="5:4 / Landscape frame with centered cover cropping."
      />
      <MediaFigure
        value={sampleImage}
        aspectRatio="4:5"
        caption="4:5 / Portrait frame with centered cover cropping."
      />
    </section>
  );
}
