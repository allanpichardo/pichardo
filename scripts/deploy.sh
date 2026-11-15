#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
target=${1:?Usage: deploy.sh artist|professional FULL_GIT_REVISION [ENV_FILE]}
revision=${2:?Supply the full Git revision to build}
env_file=${3:-"$repo_dir/infra/.env"}

case "$target" in artist|professional) ;; *) echo 'Choose artist or professional.' >&2; exit 1 ;; esac
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Use a full Git revision, not latest.' >&2; exit 1; }
[[ -f "$env_file" ]] || { echo 'Environment file does not exist.' >&2; exit 1; }
env_file=$(cd -- "$(dirname -- "$env_file")" && pwd)/$(basename -- "$env_file")
cd "$repo_dir"
[[ "$(git rev-parse HEAD)" == "$revision" ]] || { echo 'Check out the requested revision first.' >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Build deployments from a clean working tree.' >&2; exit 1; }
compose=(docker compose --env-file "$env_file" -f "$repo_dir/infra/compose.yaml")
image="pichardo-$target:$revision"
configured_images=$("${compose[@]}" config --images "$target")
printf '%s\n' "$configured_images" | grep -Fxq "$image" || {
  echo "Record $image in the selected image variable in $env_file first." >&2
  exit 1
}

docker build --file "apps/$target/Dockerfile" --target runner --tag "$image" .
if [[ "$target" == artist ]]; then
  tooling_image="pichardo-artist-tools:$revision"
  docker build --file apps/artist/Dockerfile --target tooling --tag "$tooling_image" .
  "${compose[@]}" up -d --wait postgres
  ARTIST_IMAGE="$tooling_image" "${compose[@]}" run --rm --no-deps artist pnpm payload migrate
fi
"${compose[@]}" up -d --no-deps --wait "$target"
echo "Healthy deployment of $image."
