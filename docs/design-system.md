# Artist design system

The artist frontend loads its foundation in `apps/artist/src/app/(frontend)/layout.tsx`.
Payload admin and the professional app use their own layouts and styles.

`apps/artist/src/styles/main.scss` is the global Sass entrypoint. It loads these
partials with `@use`:

- `_utopia.scss` generates fluid type and spacing tokens.
- `_colors.scss` defines palette and semantic color tokens.
- `_reset.scss` sets sizing, focus, selection, and media defaults.
- `_typography.scss` styles text elements and form controls.
- `_grid.scss` defines grid tokens and layout utilities.
- `_vars.scss` defines shared component tokens, including `--media-border-radius`.

Reset and typography rules use the `artist-site` body class. Navigation and main
content spacing stay in `SiteLayout.module.scss`. For a new global concern, add
a partial in `src/styles/` and load it once from `main.scss`. Keep component
styles in their colocated modules.

## Tokens

`apps/artist/src/styles/_utopia.scss` generates the Utopia scales once. Type
interpolates from a 20px base with a 1.2 ratio at 350px to a 24px base with a 1.25
ratio at 1600px. The type tokens run from `--step--2` through `--step-5`.

Space tokens run from `--space-3xs` through `--space-3xl`. Utopia also generates
adjacent pairs and the custom `--space-s-l` pair. Use these tokens for margins,
padding, and gaps, for example `gap: var(--space-s-m)`.

The palette contains these exact values:

| Token            | Value     |
| ---------------- | --------- |
| `--color-blue`   | `#4B91DC` |
| `--color-purple` | `#840277` |
| `--color-yellow` | `#F2CF1D` |
| `--color-pink`   | `#EB2F86` |
| `--color-navy`   | `#211959` |
| `--color-white`  | `#FFFFFF` |

Use semantic tokens for common roles: `--color-background`, `--color-text`,
`--color-link`, `--color-link-hover`, and `--color-focus`. The default page has a
white background, navy text, and purple underlined links. Selection uses navy on
yellow. Blue, pink, and yellow are available as accents. Check contrast before
using an accent as text or as a background behind text.

## Typography

`--font-heading` loads the local Momo Trust Display regular face. Headings `h1`
through `h6` use `--step-5` through `--step-0`, weight 400, and line-height 1.1.

`--font-body` loads the local DM Mono faces at weights 300, 400, and 500, with
normal and italic styles. Body text, lists, blockquotes, definitions, and controls
inherit this family. The default is `--step-0` at weight 400 and line-height 1.6.
Bold text uses weight 500. Captions and small text use `--step--1`.

Fonts are self-hosted through `next/font/local` with `display: swap`. Momo Trust
Display is preloaded. DM Mono faces load on demand. The original font files and
licenses remain in `apps/artist/src/styles/fonts`.

## Layout

Apply `u-container` to a block to center it with a maximum width of 93rem and
fluid inline padding from `--grid-gutter`. Navigation and main content already
use it. The foundation uses border-box sizing, so this maximum includes padding.

`u-grid` sets `display: grid` and `gap: var(--grid-gutter)`. It does not set column
tracks. A component can choose its own template, including
`repeat(var(--grid-columns), minmax(0, 1fr))` for the supplied 12-column grid.

Styles across both apps are mobile-first. Base rules define the small-screen
layout. Ascending minimum-width media queries add larger layouts. Upper-bound
width queries, including `max-width` and equivalent range syntax, are disallowed.
Other conditions, such as reduced motion, remain available. Artist Stylelint
checks width queries in all Sass files, including global foundations.

## Media figures

`MediaFigure` fills the available twelve-column content width below `50rem`.
At `50rem` and above, it is centered and capped at six columns, including the
five internal gutters. Images and video frames use `--media-border-radius` from
`_vars.scss`. Captions and video fallback links sit outside the rounded frame.

The optional `aspectRatio` prop accepts `5:4`, `4:5`, or `fit`. Fixed ratios use
centered cover cropping. `fit` fills the figure width and preserves the image's
natural height. Missing or null selections use `fit`, including cover images.
Videos retain their player proportions regardless of the selection.

Payload exposes the same choices as **Aspect ratio** on media blocks and each
gallery item. The default is `fit`. The selection belongs to the placement,
so the same uploaded image can appear with different ratios in different blocks.

`MediaGallery` fills the content width. Below `50rem` it uses one column; at
`50rem` and above it uses four masonry columns with `--space-xs` gaps between
thumbnails in both directions.
Items follow CMS order into the shortest column, with ties resolved left to
right. Thumbnails preserve each placement's image ratio and omit captions.
Video thumbnails use a poster or a labeled fallback. Hovering a video with a
GIF preview shows the animation; leaving restores the poster. Full video
playback remains in the lightbox.

Selecting a thumbnail opens a modal lightbox with a navy background and yellow
text and controls. The lightbox shows uncropped media and its caption. Circular
arrow buttons stay at the left and right edges of the lightbox's media area,
centered vertically, and wrap through the gallery. Only the center cell with
the media and caption scrolls when necessary; navigation stays fixed across
items. Arrow keys navigate unless focus is in the video
player. Close, Escape, or clicking the backdrop dismisses the lightbox
and restores focus to the thumbnail. A single-item gallery omits navigation.

## Write a component module

Name the root class after its component, including capitalization. Apply both
the literal class and its scoped CSS Module class to the root element. For
example, `MediaFigure` uses `.MediaFigure` and
``className={`MediaFigure ${styles.MediaFigure}`}``. Nest descendant rules in the
same order as the DOM hierarchy:

```tsx
import styles from './WorkCard.module.scss';

export function WorkCard() {
  return (
    <article className={`WorkCard ${styles.WorkCard}`}>
      <header className={styles.header}>
        <h2 className={styles.title}>Work title</h2>
      </header>
      <p>Work description.</p>
    </article>
  );
}
```

```scss
.WorkCard {
  padding: var(--space-s);

  .header {
    .title {
      margin-block-start: 0;
      color: var(--color-purple);
    }
  }

  p {
    margin-block-end: 0;
  }

  @media (min-width: 50rem) {
    padding: var(--space-l);
  }
}
```

Keep pseudo-classes and modifier classes inside the relevant rule. Use
`&:hover` and `&.active`, rather than Sass suffixes such as `&__title`. Put media
queries inside the selector they change. Do not use `:global`, `@at-root`, reverse
parent selectors, or selectors for siblings of the root.

Global token declarations, foundational resets, layout utilities, and keyframes
are exceptions to the component-root convention. Prefer inherited base styles
for standard content elements instead of restating typography in each component.

Run `pnpm lint:styles` to check styles or `pnpm lint` to include code linting.
Run `pnpm test:styles` to check the custom lint rule's passing and failing cases.
The rule validates selector structure. Code review checks that nesting matches
the JSX hierarchy.
