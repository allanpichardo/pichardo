import {Fragment} from 'react';
import {ContentArticle} from '../ContentArticle/ContentArticle';
import {ContentBlocks} from '../ContentBlocks/ContentBlocks';
import {WorkMetadata} from '../WorkMetadata/WorkMetadata';
import {PostMetadata} from '../PostMetadata/PostMetadata';
import {TagList} from '../TagList/TagList';
import {
  allDayEvent,
  embeds,
  fallbackEmbed,
  gallery,
  mediaBlocks,
  samplePage,
  samplePost,
  sampleWork,
  timedEvent,
} from './fixtures';
import styles from './Styleguide.module.scss';

const blockLabels = [
  'Rich text / FormattedText',
  'Image / MediaFigure',
  'Video / VideoPlayer',
];

export function ContentSamples() {
  return (
    <section
      id="content-blocks"
      aria-labelledby="blocks-title"
      className={`ContentSamples ${styles.ContentSamples}`}
    >
      <header className={styles.sectionHeader}>
        <p>
          <small>06 / Content</small>
        </p>
        <h2 id="blocks-title">Content blocks</h2>
        <p>
          These are the components used by public content pages, rendered with
          fixed sample data. Edit their component modules to change both the
          site and this guide.
        </p>
      </header>

      {mediaBlocks.map((block, index) => (
        <Fragment key={block.blockType + index}>
          <h3>{blockLabels[index]}</h3>
          <ContentBlocks blocks={[block]} />
        </Fragment>
      ))}

      <h3>Gallery / MediaGallery</h3>
      <ContentBlocks blocks={gallery} />
      <h3>Embeds / EmbeddedMedia</h3>
      {embeds.map(({provider, block}) => (
        <Fragment key={provider}>
          <h4>{provider}</h4>
          <ContentBlocks blocks={[block]} />
          <small>
            <a href={block.url}>Open sample on {provider}</a>
          </small>
        </Fragment>
      ))}
      <h4>Link fallback</h4>
      <ContentBlocks blocks={fallbackEmbed} />

      <h3>WorkMetadata</h3>
      <WorkMetadata work={sampleWork} />
      <h3>PostMetadata</h3>
      <PostMetadata publishedAt={samplePost.publishedAt} />
      <h3>TagList</h3>
      <TagList tags={sampleWork.tags} />

      <h3>Work article / ContentArticle</h3>
      <ContentArticle entry={{kind: 'works', doc: sampleWork}} />
      <h3>Post article / ContentArticle</h3>
      <ContentArticle entry={{kind: 'posts', doc: samplePost}} />
      <h3>Timed event / ContentArticle + EventDetails</h3>
      <ContentArticle entry={{kind: 'events', doc: timedEvent}} />
      <h3>All-day event / ContentArticle + EventDetails</h3>
      <ContentArticle entry={{kind: 'events', doc: allDayEvent}} />
      <h3>General page / ContentArticle</h3>
      <ContentArticle entry={{kind: 'pages', doc: samplePage}} />
    </section>
  );
}
