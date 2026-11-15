#!/usr/bin/env bash
set -euo pipefail
umask 077

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
env_file=${1:?Usage: restore.sh ENV_FILE BACKUP_DIR NEW_RESTORE_ROOT RESTORE_PROJECT}
backup_dir=${2:?Supply a completed backup directory}
restore_root=${3:?Supply a new absolute host directory}
restore_project=${4:?Supply a new project name starting with pichardo-restore-}
[[ -f "$env_file" ]] || { echo 'Environment file does not exist.' >&2; exit 1; }
[[ "$restore_root" == /* && ! -e "$restore_root" ]] || { echo 'Restore root must be a new absolute directory.' >&2; exit 1; }
[[ "$restore_project" =~ ^pichardo-restore-[a-z0-9][a-z0-9_-]*$ ]] || { echo 'Use a project name starting with pichardo-restore-.' >&2; exit 1; }
if docker volume inspect "${restore_project}_postgres_data" > /dev/null 2>&1; then
  echo 'Restore database volume already exists. Choose a new restore project.' >&2
  exit 1
fi
(
  cd -- "$backup_dir"
  if command -v sha256sum > /dev/null; then
    sha256sum --check SHA256SUMS
  else
    shasum -a 256 --check SHA256SUMS
  fi
)
if tar --list --gzip --file "$backup_dir/media.tar.gz" | grep -E '(^/|(^|/)\.\.(/|$))' > /dev/null; then
  echo 'Archive contains an unsafe path.' >&2
  exit 1
fi
mkdir -p -- "$restore_root/media"
export MEDIA_HOST_DIR="$restore_root/media"
compose=(docker compose --project-name "$restore_project" --env-file "$env_file" -f "$repo_dir/infra/compose.yaml")
"${compose[@]}" up -d --wait postgres
"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore --exit-on-error --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < "$backup_dir/database.dump"
"${compose[@]}" run --rm --no-deps -T --user 0 --entrypoint sh artist -c \
  'tar --extract --gzip --file - --directory /app/media --no-same-owner && chown -R 1001:1001 /app/media && chmod 750 /app/media' \
  < "$backup_dir/media.tar.gz"
if [[ -s "$backup_dir/media-files.sha256" ]]; then
  "${compose[@]}" run --rm --no-deps -T --entrypoint sh artist -c \
    'cd /app/media && sha256sum --check -' < "$backup_dir/media-files.sha256"
fi
"${compose[@]}" exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --set=ON_ERROR_STOP=1 --command="SELECT 1"' \
  > /dev/null
printf 'Restored isolated database in Compose project %s.\n' "$restore_project"
printf 'Restored media to %s/media.\n' "$restore_root"
echo 'Production data and application containers were not changed. Verify content before any cutover.'
