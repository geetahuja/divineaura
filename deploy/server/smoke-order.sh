#!/usr/bin/env bash
# Staging end-to-end test order (see smoke-order.mjs). From the PC:
#   ssh divineaura "bash /var/www/divineaura/app/deploy/server/smoke-order.sh"
# Uses a temporary admin account (random password, deleted afterwards) and asks for the
# staging password only to check the storefront page (STAGING_AUTH="user:pass", optional).
set -euo pipefail
ROOT=/var/www/divineaura
grep -q '^SITE_MODE=staging' $ROOT/shared/backend.env || { echo "Refusing: SITE_MODE is not staging"; exit 1; }
env_of() { grep -oP "^$1=\K.*" "$2"; }
API=$(env_of MEDUSA_BACKEND_URL $ROOT/shared/backend.env)
SITE=$(env_of NEXT_PUBLIC_SITE_URL $ROOT/shared/storefront.env)
PK=$(env_of NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY $ROOT/shared/storefront.env)
DBURL=$(env_of DATABASE_URL $ROOT/shared/backend.env)
EMAIL="smoke-$(date +%s)@staging.invalid"
PASS=$(openssl rand -hex 20)
cd $ROOT/app/apps/backend/.medusa/server
node $ROOT/app/apps/backend/node_modules/@medusajs/cli/cli.js user -e "$EMAIL" -p "$PASS" >/dev/null 2>&1
cleanup() {
  psql "$DBURL" -qtAc "delete from provider_identity where entity_id = '$EMAIL'; delete from auth_identity a where not exists (select 1 from provider_identity p where p.auth_identity_id = a.id); delete from \"user\" where email = '$EMAIL';" >/dev/null || true
}
trap cleanup EXIT
AUTH=""
[ -n "${STAGING_AUTH:-}" ] && AUTH="Basic $(printf %s "$STAGING_AUTH" | base64 -w0)"
API_URL=$API SITE_URL=$SITE PUBLISHABLE_KEY=$PK SMOKE_EMAIL=$EMAIL SMOKE_PASSWORD=$PASS SITE_AUTH=$AUTH \
  node $ROOT/app/deploy/server/smoke-order.mjs
