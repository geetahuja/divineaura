#!/usr/bin/env bash
# REQUIRED before going live (deploy/GO-LIVE.md): deletes every demo product
# (tag "demo" / metadata.demo) and the placeholder Sacred Places images.
# Real products, categories, pages and settings are kept.
#   ssh divineaura "bash /var/www/divineaura/app/deploy/server/remove-demo-products.sh"
set -euo pipefail
APP=/var/www/divineaura/app/apps/backend
cd "$APP/.medusa/server"
node "$APP/node_modules/@medusajs/cli/cli.js" exec ./src/scripts/remove-demo-catalogue.js
