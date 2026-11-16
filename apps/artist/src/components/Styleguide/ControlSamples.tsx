import styles from './Styleguide.module.scss';

export function ControlSamples() {
  return (
    <section
      id="controls"
      aria-labelledby="controls-title"
      className={`ControlSamples ${styles.ControlSamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>05 / Inputs</small>
        </p>
        <h2 id="controls-title">Controls</h2>
        <p>
          Native controls with inherited typography. These samples do not submit
          anything.
        </p>
      </header>

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
            <input type="radio" name="sample-format" value="audio" disabled />{' '}
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
    </section>
  );
}
