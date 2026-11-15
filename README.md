# Personal websites

Two independently deployable Next.js applications in a pnpm workspace:

| Application                | Content                | Development URL       |
| -------------------------- | ---------------------- | --------------------- |
| Artist, allanpichardo.com  | Payload and PostgreSQL | http://localhost:3000 |
| Professional, pichardo.dev | Local MDX              | http://localhost:3001 |

This foundation contains minimal public pages, CMS administration, and operating infrastructure. Visual design and portfolio content come later.

## Start development

Install Node **24.22.3**, pnpm **12.18.0**, Docker Engine or Docker Desktop, and Docker Compose. The Node version is recorded for asdf and other version managers. Select that version before installing dependencies.

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

Open the URLs above. To create an administrator, put `ADMIN_EMAIL` and a password of at least 16 characters in the artist environment file and run `pnpm bootstrap`. Remove those two values from the file afterward. Open http://localhost:3000/admin and log in. Repeating bootstrap for an existing email does not reset its password.

Use `pnpm dev:artist` or `pnpm dev:professional` to run one app. The professional app needs neither the database nor artist configuration. Normal development uses host processes and hot reload, without Docker image rebuilds.

`pnpm infra:down` stops the development database without deleting its named volume. Uploads default to `apps/artist/media` and survive process restarts. Every image in this initial Media collection is public.

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

Production has exactly three long-running containers. Only the application ports bind to host loopback. PostgreSQL uses a private Docker network and has no host port. The existing host Tunnel maps allanpichardo.com to `http://localhost:3000` and pichardo.dev to `http://localhost:3001`. This repository does not manage it.

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
