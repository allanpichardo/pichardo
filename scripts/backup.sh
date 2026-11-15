#!/usr/bin/env bash
set -euo pipefail
umask 077

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
env_file=${1:?Usage: backup.sh ENV_FILE BACKUP_ROOT}
backup_root=${2:?Supply a host backup directory outside the application containers}
[[ -f "$env_file" ]] || { echo 'Environment file does not exist.' >&2; exit 1; }
compose=(docker compose --env-file "$env_file" -f "$repo_dir/infra/compose.yaml")
mkdir -p -- "$backup_root"
backup_root=$(cd -- "$backup_root" && pwd)
backup_dir="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -- "$backup_dir.partial"
restart_artist=0

finish() {
  status=$?
  trap - EXIT
  if [[ "$restart_artist" == 1 ]]; then
    "${compose[@]}" start artist || status=1
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

artist_id=$("${compose[@]}" ps -aq artist)
[[ -n "$artist_id" ]] || { echo 'Create the artist service before backing it up.' >&2; exit 1; }
if [[ "$(docker inspect --format '{{.State.Running}}' "$artist_id")" == true ]]; then
  restart_artist=1
  "${compose[@]}" stop artist
fi
"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump --format=custom --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "$backup_dir.partial/database.dump"
"${compose[@]}" run --rm --no-deps -T --entrypoint tar artist \
  --create --gzip --file - --directory /app/media . > "$backup_dir.partial/media.tar.gz"
"${compose[@]}" run --rm --no-deps -T --entrypoint sh artist -c \
  'cd /app/media && find . -type f -exec sha256sum {} +' \
  > "$backup_dir.partial/media-files.sha256"
"${compose[@]}" exec -T postgres pg_restore --list < "$backup_dir.partial/database.dump" > /dev/null
tar --list --gzip --file "$backup_dir.partial/media.tar.gz" > /dev/null
(
  cd -- "$backup_dir.partial"
  if command -v sha256sum > /dev/null; then
    sha256sum database.dump media.tar.gz media-files.sha256 > SHA256SUMS
  else
    shasum -a 256 database.dump media.tar.gz media-files.sha256 > SHA256SUMS
  fi
)
mv -- "$backup_dir.partial" "$backup_dir"
echo "Backup created at $backup_dir. Test restoration before relying on it."
