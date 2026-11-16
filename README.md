# Personal websites

Two independently deployable Next.js applications in a pnpm workspace:

| Application                | Content                | Development URL       |
| -------------------------- | ---------------------- | --------------------- |
| Artist, allanpichardo.com  | Payload and PostgreSQL | http://localhost:3000 |
| Professional, pichardo.dev | Local MDX              | http://localhost:3001 |

The artist application includes CMS content editing, basic public pages, and structured SEO metadata. Visual design and portfolio content come later.

## Start development

Install Node **24.22.3**, pnpm **12.18.0**, Docker Engine or Docker Desktop, and Docker Compose. The Node version is recorded for asdf and other version managers. Select that version before installing dependencies.

Run `corepack enable pnpm` to make the `pnpm` command available. If you use asdf, also run `asdf reshim nodejs`. Corepack selects the pnpm version pinned in `package.json`. The first run may download pnpm.

Install FFmpeg and ffprobe with the SVT-AV1, H.264, Opus, and AAC codecs for artist uploads and processing. On macOS use `brew install ffmpeg`; on Debian or Ubuntu use `sudo apt-get install ffmpeg`. Production artist images include these tools.

```sh
pnpm install --frozen-lockfile
cp apps/artist/.env.example apps/artist/.env
cp apps/professional/.env.example apps/professional/.env
openssl rand -hex 32
```

Put the generated value in `PAYLOAD_SECRET` in `apps/artist/.env`. The other artist defaults match development Compose. Environment files are ignored by Git.

```sh
pnpm infra:up
pnpm generate
pnpm dev
```

Run `pnpm dev:worker` in a second terminal using the same artist environment. Media uploads queue work until the worker is running. It processes one file at a time and logs `Media worker ready` after startup recovery and acquiring the database lock. A second worker cannot process the same queue concurrently.

Open the URLs above. To create an administrator, put `ADMIN_EMAIL` and a password of at least 16 characters in the artist environment file and run `pnpm bootstrap`. Remove those two values from the file afterward. Open http://localhost:3000/admin and log in. Repeating bootstrap for an existing email does not reset its password.

Use `pnpm dev:artist` or `pnpm dev:professional` to run one app. The professional app needs neither the database nor artist configuration. Normal development uses host processes and hot reload, without Docker image rebuilds.

`pnpm infra:down` stops the development database without deleting its named volume. Media defaults to `apps/artist/media` and survives process restarts. Originals and temporary work are private. Completed image renditions, video sources, posters, and previews are public.

## Upload artist media

Use the Media collection in Payload and supply alt text. Images may be JPEG, PNG, or WebP; video sources may be MP4, MOV, or WebM. The limit is 50,000,000 bytes per file. Saving queues background processing. The CMS shows queued, processing, ready, or failed status and provides a retry action. Replacing a file keeps its previous publication available until the new outputs are ready.

Images use WebP quality 90 only when the candidate is smaller. Otherwise the public rendition is a copy of the uploaded image. Responsive widths are 400, 800, and 1600 pixels without enlargement. Videos produce AV1 WebM and H.264 MP4 files fitted within 1920×1080 at no more than 30 fps, plus a WebP poster and sampled looping GIF preview. Uploaded videos and YouTube/Vimeo embeds use Video.js 10 with site-styled controls and download or provider links. SoundCloud and Spotify retain their audio embeds.

`MEDIA_DIR` contains separate `originals`, `work`, and `published` directories. Retain the entire directory with the database. Originals remain until their Media record is deleted; replacing a file retains its earlier originals. Retired public generations remain for 24 hours. The empty directory configured for Payload's native file storage is deliberately separate from actual files.

The media migration imports existing images and their variants without changing their IDs or URLs. It copies and verifies private originals before recording the publication. It does not re-encode existing images. To queue a new optimized generation for one record, run `MEDIA_ID=123 pnpm --filter @pichardo/artist media:reprocess`. Omit `MEDIA_ID` to queue all retained media. Keep the worker running to process the queue.

## Run checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm format` to format source. Type checking generates Next.js route types first. Artist builds also regenerate Payload types and the admin import map. Keep those generated files in version control. Production builds use Next.js's supported webpack compiler for a consistent MDX and Payload build path.

Database and browser tests require a separate database whose name ends in `_test`. They must never point at development or production data. With development infrastructure running, create the test database once:

```sh
docker compose -f infra/compose.dev.yaml exec postgres createdb -U payload artist_test
export NODE_ENV=test
export DATABASE_URL=postgresql://payload:development-only@127.0.0.1:5432/artist_test
export PAYLOAD_SECRET=$(openssl rand -hex 32)
export ADMIN_EMAIL=smoke@example.test
export ADMIN_PASSWORD=$(openssl rand -hex 24)
export ARTIST_URL=http://127.0.0.1:3000
export PROFESSIONAL_URL=http://127.0.0.1:3001
export MEDIA_DIR=$(mktemp -d)
pnpm migrate
pnpm test:integration
pnpm bootstrap
NODE_ENV=production pnpm build
pnpm exec playwright install chromium
E2E_PRODUCTION=true pnpm test:e2e
```

Stop development servers before browser tests. Playwright starts its own servers and refuses to reuse an occupied port. Integration tests create a temporary media directory and clean up their records. Browser tests remove their uploaded record and files. Test administrator credentials remain confined to the test database.

Unset the exported test variables or use a new terminal before returning to development.

```sh
pnpm test:containers
```

This separate test requires the Chromium installation above. It builds all image targets and starts a uniquely named disposable Compose stack. It runs the browser suite against the standalone containers and verifies HTTP, authentication, uploads, loopback bindings, database isolation, container recreation, professional independence, and a database plus media backup restoration. It deletes only its own Compose containers and volumes. Logs are in `test-results/containers`. Temporary backup artifacts remain at the printed path for inspection. Test ports default to 31300 and 31301 and can be changed with `TEST_ARTIST_PORT` and `TEST_PROFESSIONAL_PORT`.

GitHub Actions is configured to run code checks with disposable PostgreSQL and production-container verification in two jobs. It uses generated test credentials, not production secrets.

## Edit artist content

Payload's Content group contains Work, Events, Posts, and Pages. Save drafts while editing, then publish to make content public. Editing an already published document as a draft keeps its published revision visible. Taxonomies have separate Work category, Work tag, Event type, and Post tag collections. Each work has at most one category. Work and Post tags are independent.

Work, Post, and Page content uses repeatable text, media, gallery, and embed blocks. Embeds support YouTube, Vimeo, SoundCloud, and Spotify URLs. Other web URLs render as links. Events support all-day ranges with inclusive end dates, or timed ranges with an explicit IANA timezone. Enter timed dates using the admin date picker's timezone, then set the event timezone used for public display.

Info holds the artist name, site title, description, biography, default social image, favicon, and social profiles. Saving Info changes the public site immediately. Its image fields use the existing image uploads, without adding ICO or SVG support. Uploads become publicly usable after the media worker finishes processing them.

Published work appears at `/work/[slug]`, events at `/events/[slug]`, posts at `/blog/[slug]`, and general pages at `/[slug]`. The `/blog` listing shows published posts newest first. System paths and content prefixes are reserved against Page slug collisions.

Each content entry has optional SEO title, description, and social-image overrides. Metadata falls back to its content fields, then Info. Work supports multiple Schema.org types, defaulting to CreativeWork. Pages offer all WebPage subtypes, defaulting to WebPage. Events use Event and posts use Article. Type selectors affect JSON-LD classification; they do not add type-specific editing forms. The sitemap includes published content only.

Schema type choices come from the committed Schema.org 30.1 catalog. Run `pnpm schema:generate` to regenerate it from the official release definitions. This command needs network access; the CMS and public site do not fetch the vocabulary at runtime. Review catalog changes and generate a migration if select options change.

## Change the CMS schema

Only development enables Payload's schema push. It is a sandbox convenience, not the production migration process.

```sh
pnpm generate
pnpm migrate:create describe_the_change
```

Review and commit the generated migration and schema snapshot. Test all migrations against a fresh test database with `NODE_ENV=test`, then run `pnpm migrate` a second time to confirm there is nothing left to apply. Do not apply migrations to a development database that has already received the same changes through schema push.

`pnpm migrate:status` reports migration state. Set `PAYLOAD_DB_PUSH=false` to disable development push when rehearsing migrations. Test and production always disable push. Production migration execution is an explicit deployment step, not an application-startup side effect.

## Configure runtime environments

| Variable                        | Used by             | Purpose                                                                                        |
| ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Artist              | PostgreSQL connection URL. Compose constructs it on the internal network.                      |
| `PAYLOAD_SECRET`                | Artist              | Stable random secret of at least 32 characters. Preserve it through deployment and recovery.   |
| `ARTIST_URL`                    | Artist              | Browser-facing origin. Required in production. HTTPS enables secure authentication cookies.    |
| `MEDIA_DIR`                     | Artist              | Upload path. Relative paths resolve from the application directory. Compose sets `/app/media`. |
| `PAYLOAD_DB_PUSH`               | Artist development  | Set `false` to disable development-only schema synchronization.                                |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap and tests | Explicit administrator creation. Not needed by the running application.                        |
| `PROFESSIONAL_URL`              | Professional        | Metadata origin. Defaults to the public domain in production.                                  |

Production image tags, loopback ports, database settings, and host media path are documented in `infra/.env.example`. Never commit environment files, database dumps, or uploads. Configured HTTP origins support local operation without Cloudflare. Use HTTPS public origins behind the separately managed Tunnel.

## Deploy and recover

Follow [the operating guide](docs/operations.md) for image builds, administrator bootstrap, explicit migrations, independent app deployment, health checks, image rollback, manual backups, and isolated restoration.

Production has four long-running containers, including `artist-worker`. The worker uses the matching artist tooling image, PostgreSQL, and the media mount, with no published port. Only the application ports bind to host loopback. PostgreSQL uses a private Docker network and has no host port. The existing host Tunnel maps allanpichardo.com to `http://localhost:3000` and pichardo.dev to `http://localhost:3001`. This repository does not manage it.

Backups are manual. No cron job, retention deletion, image publishing, or production deployment automation is installed.

## Troubleshoot

- A Node engine error means the selected Node version does not match `.node-version`.
- A native build approval error means a new dependency needs review in pnpm's `allowBuilds` map. Do not enable every dependency script.
- Missing tables mean migrations are absent or the connection targets the wrong database.
- Failed uploads usually mean the media directory is not writable by container UID 1001. Production directories must exist before Compose starts.
- A production admin login over local HTTP needs an HTTP `ARTIST_URL`. The public HTTPS setting intentionally uses secure cookies.
- `next start` can warn about standalone output. Production images execute the generated standalone server directly. Local smoke tests use `next start`.
- No outgoing email provider is configured in this sprint. Payload's default email adapter logs messages locally. Do not rely on emailed password recovery. Configure a real adapter before using that workflow publicly.

See [architecture and tradeoffs](docs/architecture.md) for ownership, caching, and tooling choices.
