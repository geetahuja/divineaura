#!/usr/bin/env bash
# Deploy the latest code to the VPS (ARCHITECTURE.md §18). Run as the deploy user:
#   bash /var/www/divineaura/app/deploy/deploy.sh [branch]      (default: DEPLOY_BRANCH or main)
# From the PC (PowerShell):  ssh divineaura "bash /var/www/divineaura/app/deploy/deploy.sh"
#
# Each commit is built in its own folder (releases/<sha>) while the old one keeps
# serving. Then: migrations → switch the "app" symlink → pm2 reload (one instance
# at a time = no downtime) → health checks. If they fail, the previous release is
# switched back and reloaded automatically. Keeps the last 3 releases.
# ponytail: database migrations are not undone on rollback — Medusa migrations are
# additive; take a Hostinger snapshot before big updates.
set -euo pipefail
ROOT=/var/www/divineaura
REPO=$ROOT/repo
SHARED=$ROOT/shared
LOCK=$ROOT/.deploy.lock
REMOTE=git@github.com:geetahuja/divineaura.git
[ -f "$SHARED/deploy.conf" ] && . "$SHARED/deploy.conf"   # DEPLOY_BRANCH=…
BRANCH=${1:-${DEPLOY_BRANCH:-main}}
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1 MEDUSA_DISABLE_TELEMETRY=true

exec 9>"$LOCK"; flock -n 9 || { echo "Another deploy is running."; exit 1; }
log() { printf '\n[%s] %s\n' "$(date +%T)" "$*"; }
[ "$(id -un)" = deploy ] || { echo "Run as the deploy user"; exit 1; }

log "Fetching $BRANCH"
[ -d "$REPO/.git" ] || git clone --quiet "$REMOTE" "$REPO"
git -C "$REPO" fetch --quiet --prune origin
SHA=$(git -C "$REPO" rev-parse "origin/$BRANCH")
REL=$ROOT/releases/$SHA
PREV=$(readlink -f "$ROOT/app" 2>/dev/null || true)
echo "commit ${SHA:0:7}: $(git -C "$REPO" log -1 --format=%s "$SHA")"

if [ ! -f "$REL/.built" ]; then
  rm -rf "$REL" && mkdir -p "$REL"
  git -C "$REPO" archive "$SHA" | tar -x -C "$REL"
  echo "$SHA" >"$REL/REVISION"
  ln -sfn "$SHARED/backend.env" "$REL/apps/backend/.env"
  ln -sfn "$SHARED/storefront.env" "$REL/apps/storefront/.env.production.local"

  log "Installing dependencies"
  (cd "$REL" && pnpm install --frozen-lockfile --prefer-offline --reporter=silent)

  log "Building backend + admin"
  (cd "$REL/apps/backend" && NODE_OPTIONS=--max-old-space-size=3072 pnpm exec medusa build)
  ln -sfn "$SHARED/backend.env" "$REL/apps/backend/.medusa/server/.env"
fi

log "Migrations (+ first-run seed)"
(cd "$REL/apps/backend/.medusa/server" && node "$REL/apps/backend/node_modules/@medusajs/cli/cli.js" db:migrate)

switch_to() { ln -sfn "$1" "$ROOT/app.new" && mv -Tf "$ROOT/app.new" "$ROOT/app"; }
reload() {
  pm2 startOrReload "$ROOT/app/deploy/ecosystem.config.cjs" --update-env >/dev/null
  pm2 save >/dev/null
}
healthy() {
  for _ in $(seq 1 45); do
    if curl -fsS -m 5 http://127.0.0.1:9000/health >/dev/null && curl -fsS -m 5 http://127.0.0.1:3000/api/health >/dev/null \
       && curl -fsS -m 15 -o /dev/null http://127.0.0.1:3000/; then return 0; fi
    sleep 2
  done
  return 1
}

# The storefront build reads the catalogue (sitemap, static pages) from the API. On the
# very first deploy nothing serves it yet: start the new backend before building.
if ! curl -fsS -m 5 http://127.0.0.1:9000/health >/dev/null; then
  log "No API running — starting the new backend first"
  switch_to "$REL"
  pm2 startOrReload "$ROOT/app/deploy/ecosystem.config.cjs" --only medusa-server,medusa-worker --update-env >/dev/null
  for _ in $(seq 1 60); do curl -fsS -m 5 http://127.0.0.1:9000/health >/dev/null && break; sleep 2; done
fi

# The storefront needs the publishable API key at build time; take it from the database once.
if ! grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_' "$SHARED/storefront.env"; then
  DBURL=$(grep -oP '^DATABASE_URL=\K.*' "$SHARED/backend.env")
  KEY=$(psql "$DBURL" -tAc "select token from api_key where type = 'publishable' and revoked_at is null and deleted_at is null order by created_at limit 1")
  [ -n "$KEY" ] || { echo "No publishable API key in the database"; exit 1; }
  sed -i "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$KEY|" "$SHARED/storefront.env"
  rm -f "$REL/.storefront-built"
fi

if [ ! -f "$REL/.storefront-built" ]; then
  log "Building storefront"
  # One retry: the build downloads Google Fonts, which occasionally fails.
  sf_build() { (cd "$REL/apps/storefront" && NODE_OPTIONS=--max-old-space-size=3072 pnpm exec next build --webpack); }
  sf_build || { log "Storefront build failed — retrying once"; sleep 15; sf_build; }
  touch "$REL/.storefront-built"
fi
touch "$REL/.built"

log "Switching to ${SHA:0:7} and reloading"
switch_to "$REL"
reload
if healthy; then
  log "Healthy: ${SHA:0:7} is live"
else
  log "HEALTH CHECK FAILED"
  pm2 logs --nostream --lines 40 || true
  if [ -n "$PREV" ] && [ "$PREV" != "$REL" ] && [ -d "$PREV" ]; then
    log "Rolling back to $(basename "$PREV" | cut -c1-7)"
    switch_to "$PREV"
    reload
    healthy && log "Rolled back; previous release is serving." || log "Previous release is unhealthy too — check pm2 logs."
  fi
  exit 1
fi

# Keep the current + 2 previous releases.
ls -1dt "$ROOT"/releases/*/ | tail -n +4 | while read -r old; do [ "$(readlink -f "$ROOT/app")/" = "$old" ] || rm -rf "$old"; done
