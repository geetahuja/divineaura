#!/usr/bin/env bash
# STAGING ONLY: adds the demo catalogue (16 products tagged "demo", AI placeholder
# images, "Representative image" on the site) and placeholder Sacred Places photos.
#   ssh divineaura "bash /var/www/divineaura/app/deploy/server/seed-demo-products.sh"
# Safe to re-run (existing demo products are skipped). Remove before launch with
# remove-demo-products.sh (deploy/GO-LIVE.md).
set -euo pipefail
SHARED=/var/www/divineaura/shared
grep -q '^SITE_MODE=staging$' "$SHARED/backend.env" || { echo "Refusing: SITE_MODE is not staging."; exit 1; }
APP=/var/www/divineaura/app/apps/backend
cd "$APP/.medusa/server"
node "$APP/node_modules/@medusajs/cli/cli.js" exec ./src/scripts/seed-demo-catalogue.js
