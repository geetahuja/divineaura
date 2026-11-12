#!/usr/bin/env bash
# Password-protected copy of the production .env files (ENV_FILES in backup.conf).
#   sudo /usr/local/lib/divineaura-backup/secrets-backup.sh
# Asks for a password (twice), writes $BACKUP_DIR/secrets/env-<date>.tar.gz.gpg
# (AES-256, gpg symmetric). Run it after every .env change. See RESTORE.md §Secrets.
# Decrypt (Linux, or Git Bash on Windows):  gpg -d env-<date>.tar.gz.gpg | tar -xzvf -
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
CONF=${BACKUP_CONFIG:-/etc/divineaura/backup.conf}
[ -f "$CONF" ] || CONF="$here/backup.conf"
# shellcheck source=backup.conf
. "$CONF"
umask 027

rel=()
for f in $ENV_FILES; do
  [ -f "$f" ] || { echo "ERROR: not found: $f (fix ENV_FILES in $CONF)" >&2; exit 1; }
  rel+=("${f#/}")
done
out_dir="$BACKUP_DIR/secrets"
out="$out_dir/env-$(TZ="${BACKUP_TIMEZONE:-UTC}" date '+%Y-%m-%d_%H%M').tar.gz.gpg"
mkdir -p "$out_dir"

tar -czf - -C / "${rel[@]}" | gpg --symmetric --cipher-algo AES256 --pinentry-mode loopback --output "$out"
echo "Encrypted copy: $out ($(du -h "$out" | cut -f1)) containing:"
printf '  /%s\n' "${rel[@]}"
echo "Download it to your PC, then store it as described in RESTORE.md. Never commit it to GitHub."
