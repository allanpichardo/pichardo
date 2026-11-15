# Deploy and recover the websites

Run these commands on the Linux host from the repository root. Docker Engine, Docker Compose, Git, and Bash must already be available. These procedures do not install or change cloudflared.

## Prepare persistent storage and configuration

Create the media directory before starting Compose:

```sh
sudo install -d -o 1001 -g 1001 -m 750 /srv/pichardo/media
cp infra/.env.example infra/.env
chmod 600 infra/.env
openssl rand -hex 32
openssl rand -hex 32
```

Put the first random value in `POSTGRES_PASSWORD` and the second in `PAYLOAD_SECRET`. Use a hex database password because Compose embeds it in the database connection URL. Set `MEDIA_HOST_DIR` to the absolute media path.

Set `ARTIST_IMAGE` to `pichardo-artist:<full Git revision>` and `PROFESSIONAL_IMAGE` to `pichardo-professional:<full Git revision>`. Keep each application image value at its deployed revision when updating the other application. Do not use `latest`.

Validate configuration without printing secrets:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml config --quiet
```

The three services are `artist`, `professional`, and `postgres`. PostgreSQL has a named volume mounted at `/var/lib/postgresql`. Media has a host bind mount at `/app/media`. Never run `docker compose down --volumes` against production.

## Bootstrap the first administrator

Complete this step before starting the artist HTTP service. Use the same revision for tooling and application images:

```sh
revision=$(git rev-parse HEAD)
docker build -f apps/artist/Dockerfile --target tooling -t "pichardo-artist-tools:$revision" .
docker compose --env-file infra/.env -f infra/compose.yaml up -d --wait postgres
ARTIST_IMAGE="pichardo-artist-tools:$revision" docker compose --env-file infra/.env -f infra/compose.yaml run --rm --no-deps artist pnpm payload migrate
read -r -p 'Administrator email: ' ADMIN_EMAIL
read -r -s -p 'Administrator password: ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
ARTIST_IMAGE="pichardo-artist-tools:$revision" docker compose --env-file infra/.env -f infra/compose.yaml run --rm --no-deps -e ADMIN_EMAIL -e ADMIN_PASSWORD artist pnpm bootstrap
unset ADMIN_EMAIL ADMIN_PASSWORD
```

The bootstrap command uses Payload's Local API. It does not replace Payload authentication. Keep the database and media directories after bootstrapping.

## Deploy one application

For an existing artist deployment, create a backup before migration. Check out a clean committed revision. Record its full revision in the selected image variable in `infra/.env`.

```sh
revision=$(git rev-parse HEAD)
bash scripts/deploy.sh artist "$revision" infra/.env
bash scripts/deploy.sh professional "$revision" infra/.env
```

Run only the command for the application you intend to update. The script requires the environment file's image tag to match the requested revision. It builds locally on the server's architecture.

Artist deployment builds the application and tooling targets, waits for PostgreSQL, runs `payload migrate` through the tooling image, and updates the artist container only after migration succeeds. Application startup does not synchronize the production schema. Professional deployment does not start or migrate PostgreSQL.

The script waits for the selected application's health check. A failed startup leaves the new container available for inspection. Do not assume deployment succeeded because the image built.

Verify the origin directly:

```sh
curl --fail http://127.0.0.1:3000/health
curl --fail http://127.0.0.1:3001/health
docker compose --env-file infra/.env -f infra/compose.yaml ps
ss -ltn
```

The application listeners must be `127.0.0.1:3000` and `127.0.0.1:3001`, unless you configured other host ports. PostgreSQL must not publish a host port. Inside their containers, both applications listen on `0.0.0.0:3000`.

The separately managed host Tunnel connects `allanpichardo.com` to `http://localhost:3000` and `pichardo.dev` to `http://localhost:3001`. No Tunnel is needed for local health verification. Do not add a reverse proxy or cloudflared service to this Compose project.

## Roll back an application image

Record the previous immutable image tag in the selected variable in `infra/.env`, then recreate only that application:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up -d --no-deps --wait artist
```

Use `professional` instead to roll back the professional site. Keep the old images until their rollback window closes.

An image rollback does not reverse a database migration. Confirm that the old artist image supports the current schema before starting it. If it does not, use a forward fix or the isolated restore procedure. Never run migration rollback commands automatically.

## Back up the database and media

Choose a protected host directory outside the containers. Run the backup manually:

```sh
bash scripts/backup.sh infra/.env /srv/backups/pichardo
```

The script stops a running artist container so its database and media cannot change during backup. It restarts that container on exit, including after failure. The professional site remains available.

A completed backup contains a PostgreSQL custom-format logical dump, a compressed media archive, individual media checksums, and `SHA256SUMS`. A failed backup keeps a `.partial` directory. The script does not schedule backups or delete old ones.

Copy completed backups to a separate machine or encrypted off-server destination. Restrict access because the database dump contains authentication records and private administrative data. Also retain the matching application revision and securely preserve the runtime configuration and Payload secret.

A readable archive and matching checksums prove that a backup file is intact. They do not prove the application can use restored data.

## Test a restore without replacing production

Choose a new absolute directory and a new project name starting with `pichardo-restore-`:

```sh
bash scripts/restore.sh infra/.env /srv/backups/pichardo/COMPLETED_BACKUP /srv/pichardo-restore-test pichardo-restore-test
```

The script verifies backup checksums, creates a fresh isolated PostgreSQL volume, restores the dump, extracts media into the new directory, and verifies every backed-up media file. It refuses an existing restore directory or database volume. Production application containers and production data remain unchanged.

To inspect restored data, start artist against that isolated project with a different loopback host port. Use the application image matching the backup:

```sh
MEDIA_HOST_DIR=/srv/pichardo-restore-test/media ARTIST_PORT=3100 docker compose --project-name pichardo-restore-test --env-file infra/.env -f infra/compose.yaml up -d --no-deps --wait artist
curl --fail http://127.0.0.1:3100/health
```

Log in at `http://127.0.0.1:3100/admin`, check the expected media records, and retrieve an original and generated variant. The production `ARTIST_URL` can produce production-origin links during inspection. Use a separate protected restore environment file with `ARTIST_URL=http://127.0.0.1:3100` when testing admin navigation.

After verification, explicitly remove only the restore resources you no longer need. A real recovery requires a deliberate cutover to the restored database volume and media directory. Stop artist writes first, preserve the current production data, and verify the restored application before directing the host Tunnel to it.

## Inspect caching and administrative protection

Keep Cloudflare's default static-asset caching. Do not enable a rule that caches all HTML or all `/api` responses. Preserve Next.js `Vary` and React Server Component headers.

Next.js supplies immutable cache headers for its versioned `/_next/static/` assets. Payload public originals and generated variants receive a one-hour public cache lifetime. Replacing a media file can leave the old file cached until that lifetime expires. Admin, authentication, health, preview, and dynamic API responses must stay private or uncached.

Inspect origin headers first, then the public hostname:

```sh
curl -I http://127.0.0.1:3000/api/media/file/EXAMPLE.webp
curl -I https://allanpichardo.com/api/media/file/EXAMPLE.webp
curl -I https://allanpichardo.com/admin/login
```

Check `Cache-Control`, `Age`, `CF-Cache-Status`, and `Vary`. A cold `MISS` followed by `HIT` can confirm edge caching for an eligible public media URL. A Cloudflare cache bypass rule for `/admin*` and authentication endpoints can reinforce the application's response headers. Do not add blanket HTML caching, a Worker, or custom invalidation.

If you configure Cloudflare Access separately, scope it to `/admin` and its descendants. Payload authentication remains required. Leave public pages and `/api/media/file/*` public. Expanding Access to the whole `/api` tree can block public media and browser requests needed by the admin interface. Verify the admin login and upload workflow after any Access policy change.

## Diagnose startup and persistence problems

Inspect the selected service without printing the resolved environment configuration:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml logs --tail=100 artist
docker compose --env-file infra/.env -f infra/compose.yaml logs --tail=100 postgres
```

For upload permission errors, confirm the host media directory exists and belongs to UID 1001 and GID 1001. For missing database tables, run the matching tooling image's migration command before restarting artist. For stale public media, inspect origin headers and the edge cache lifetime.

Changing `POSTGRES_PASSWORD` in the environment file does not change the password of an already initialized PostgreSQL user. Rotate the actual database password through PostgreSQL tooling, then update the protected environment file. Do not put passwords in command arguments or logs.

For port conflicts, change only the host port variables and keep the Tunnel's separately managed mapping synchronized through its owner. A healthy professional site must remain independent of artist and PostgreSQL availability.
