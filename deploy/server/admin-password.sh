#!/usr/bin/env bash
# Set (or reset) an admin's password on the server — typed by you, hidden, never stored
# anywhere else. From your PC (PowerShell), in your own terminal:
#   ssh -t divineaura "bash /var/www/divineaura/app/deploy/server/admin-password.sh you@example.com"
# Creates the admin user first if it doesn't exist yet.
set -euo pipefail
EMAIL=${1:?Usage: admin-password.sh <email>}
APP=/var/www/divineaura/app/apps/backend
CLI="node $APP/node_modules/@medusajs/cli/cli.js"
cd "$APP/.medusa/server"

read -rsp "New admin password for $EMAIL (min 12 characters): " P1; echo
read -rsp "Repeat it: " P2; echo
[ "$P1" = "$P2" ] || { echo "Passwords don't match."; exit 1; }
[ ${#P1} -ge 12 ] || { echo "Use at least 12 characters."; exit 1; }

DBURL=$(grep -oP '^DATABASE_URL=\K.*' /var/www/divineaura/shared/backend.env)
if [ "$(psql "$DBURL" -tAc "select count(*) from \"user\" where email = '${EMAIL//\'/}' and deleted_at is null")" = 0 ]; then
  # medusa user needs a password argument: give it a random throwaway, replaced below.
  $CLI user -e "$EMAIL" -p "$(openssl rand -hex 24)" >/dev/null
  echo "Admin user created."
fi
NEW_ADMIN_PASSWORD="$P1" $CLI exec ./src/scripts/reset-admin-password.js "$EMAIL" 2>&1 | grep -E "Password updated|Error|No admin" || true
