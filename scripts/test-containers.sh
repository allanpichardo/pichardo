#!/usr/bin/env bash
set -euo pipefail
umask 077

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_dir"
suffix="$(date +%s)-$$"
project="pichardo-smoke-$suffix"
restore_project="pichardo-restore-smoke-$suffix"
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/pichardo-smoke.XXXXXX")
test_dir=$(cd "$test_dir" && pwd -P)
mkdir -p "$test_dir/media" test-results/containers
env_file="$test_dir/.env"
export ARTIST_IMAGE="pichardo-artist:smoke-$suffix"
export PROFESSIONAL_IMAGE="pichardo-professional:smoke-$suffix"
tooling_image="pichardo-artist-tools:smoke-$suffix"
export ARTIST_WORKER_IMAGE="$tooling_image"
export ARTIST_PORT="${TEST_ARTIST_PORT:-31300}"
export PROFESSIONAL_PORT="${TEST_PROFESSIONAL_PORT:-31301}"
export ARTIST_URL="http://127.0.0.1:$ARTIST_PORT"
export PROFESSIONAL_URL="http://127.0.0.1:$PROFESSIONAL_PORT"
export MEDIA_HOST_DIR="$test_dir/media"
export POSTGRES_USER=payload POSTGRES_DB=artist_test
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export PAYLOAD_SECRET="$(openssl rand -hex 32)"
export ADMIN_EMAIL=container@example.test
export ADMIN_PASSWORD="$(openssl rand -hex 24)"
printf 'ARTIST_IMAGE=%s\nARTIST_WORKER_IMAGE=%s\nPROFESSIONAL_IMAGE=%s\nPOSTGRES_USER=%s\nPOSTGRES_DB=%s\nPOSTGRES_PASSWORD=%s\nPAYLOAD_SECRET=%s\nMEDIA_HOST_DIR=%s\n' \
  "$ARTIST_IMAGE" "$ARTIST_WORKER_IMAGE" "$PROFESSIONAL_IMAGE" "$POSTGRES_USER" "$POSTGRES_DB" "$POSTGRES_PASSWORD" "$PAYLOAD_SECRET" "$MEDIA_HOST_DIR" > "$env_file"
compose=(docker compose --project-name "$project" --env-file "$env_file" -f infra/compose.yaml)
restored=(docker compose --project-name "$restore_project" --env-file "$env_file" -f infra/compose.yaml)

cleanup() {
  status=$?
  trap - EXIT
  mkdir -p test-results/containers
  "${compose[@]}" logs --no-color > test-results/containers/compose.log 2>&1 || true
  "${restored[@]}" logs --no-color > test-results/containers/restore.log 2>&1 || true
  "${compose[@]}" down --volumes --remove-orphans > /dev/null 2>&1 || true
  "${restored[@]}" down --volumes --remove-orphans > /dev/null 2>&1 || true
  printf 'Disposable artifacts remain at %s.\n' "$test_dir"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker build -f apps/artist/Dockerfile --target runner -t "$ARTIST_IMAGE" .
docker build -f apps/artist/Dockerfile --target tooling -t "$tooling_image" .
docker build -f apps/professional/Dockerfile --target runner -t "$PROFESSIONAL_IMAGE" .
"${compose[@]}" config --quiet
"${compose[@]}" run --rm --no-deps --user 0 --entrypoint sh artist -c 'chown 1001:1001 /app/media && chmod 750 /app/media'
"${compose[@]}" up -d --wait postgres
ARTIST_IMAGE="$tooling_image" "${compose[@]}" run --rm --no-deps artist pnpm payload migrate
ARTIST_IMAGE="$tooling_image" "${compose[@]}" run --rm --no-deps artist pnpm payload migrate
ARTIST_IMAGE="$tooling_image" "${compose[@]}" run --rm --no-deps -e ADMIN_EMAIL -e ADMIN_PASSWORD artist pnpm bootstrap
"${compose[@]}" up -d --wait
E2E_EXTERNAL=true pnpm test:e2e
worker_id=$("${compose[@]}" ps -q artist-worker)
worker_start=$("${compose[@]}" exec -T artist-worker node -e 'console.log(JSON.parse(require("node:fs").readFileSync("/app/media/work/worker-heartbeat","utf8")).processStart)')
"${compose[@]}" restart artist-worker
"${compose[@]}" up -d --no-deps --wait artist-worker
[[ "$("${compose[@]}" ps -q artist-worker)" == "$worker_id" ]]
new_worker_start=$("${compose[@]}" exec -T artist-worker node -e 'console.log(JSON.parse(require("node:fs").readFileSync("/app/media/work/worker-heartbeat","utf8")).processStart)')
[[ "$worker_start" != "$new_worker_start" ]] || { echo 'Worker health reused a stale process heartbeat.' >&2; exit 1; }
node scripts/media-container-recovery.mjs queue "$test_dir/recovery.json"
encoder_seen=0
for attempt in {1..100}; do
  if "${compose[@]}" exec -T artist-worker node -e 'const fs=require("node:fs");process.exit(fs.readdirSync("/proc").some(p=>{try{return fs.readFileSync(`/proc/${p}/comm`,"utf8").trim()==="ffmpeg"}catch{return false}})?0:1)'; then
    encoder_seen=1
    break
  fi
  sleep 0.1
done
[[ "$encoder_seen" == 1 ]] || { echo 'No live encoder observed before recovery test.' >&2; exit 1; }
worker_id=$("${compose[@]}" ps -q artist-worker)
docker update --restart=no "$worker_id" > /dev/null
"${compose[@]}" kill --signal SIGKILL artist-worker
[[ "$(docker inspect --format '{{.State.Running}}' "$worker_id")" == false ]]
"${compose[@]}" up -d --no-deps --wait --force-recreate artist-worker
source_keys=$("${compose[@]}" exec -T artist-worker node -e 'console.log(JSON.stringify(require("node:fs").readdirSync("/app/media/originals")))')
node scripts/media-container-recovery.mjs verify "$test_dir/recovery.json" "$source_keys"

for app in artist professional; do
  id=$("${compose[@]}" ps -q "$app")
  bindings=$(docker inspect --format '{{range (index .HostConfig.PortBindings "3000/tcp")}}{{.HostIp}}{{end}}' "$id")
  [[ "$bindings" == 127.0.0.1 ]] || { echo 'Application is not bound exclusively to loopback.' >&2; exit 1; }
done
postgres_id=$("${compose[@]}" ps -q postgres)
[[ "$(docker inspect --format '{{len .HostConfig.PortBindings}}' "$postgres_id")" == 0 ]]
node scripts/container-smoke.mjs seed "$test_dir/state.json"
"${compose[@]}" stop artist-worker artist postgres
node --input-type=module -e 'import assert from "node:assert/strict"; assert.equal((await fetch(process.env.PROFESSIONAL_URL+"/health")).status,200);'
"${compose[@]}" up -d --wait --force-recreate postgres artist artist-worker
node scripts/container-smoke.mjs verify "$test_dir/state.json"

COMPOSE_PROJECT_NAME="$project" bash scripts/backup.sh "$env_file" "$test_dir/backups"
[[ -n "$("${compose[@]}" ps -q --status running artist-worker)" ]]
"${compose[@]}" rm --force --stop artist-worker
COMPOSE_PROJECT_NAME="$project" bash scripts/backup.sh "$env_file" "$test_dir/pre-worker-backups"
[[ -z "$("${compose[@]}" ps -aq artist-worker)" ]]
backup_dir=$(find "$test_dir/backups" -mindepth 1 -maxdepth 1 -type d ! -name '*.partial')
[[ -n "$backup_dir" ]]
bash scripts/restore.sh "$env_file" "$backup_dir" "$test_dir/restored" "$restore_project"
"${compose[@]}" stop artist-worker artist
MEDIA_HOST_DIR="$test_dir/restored/media" "${restored[@]}" up -d --no-deps --wait artist
node scripts/container-smoke.mjs verify "$test_dir/state.json"
echo 'Production startup, isolation, persistence, and backup restoration passed.'
