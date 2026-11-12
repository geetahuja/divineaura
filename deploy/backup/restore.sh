#!/usr/bin/env bash
# Restore DivineAura from a backup made by backup.sh. See RESTORE.md.
#   sudo restore.sh                         → list available backups
#   sudo restore.sh 2026-11-12_0230         → restore database AND uploads from that backup
#   sudo restore.sh 2026-11-12_0230 db      → database only
#   sudo restore.sh 2026-11-12_0230 uploads → uploads only
# Before overwriting anything it saves the CURRENT database to $BACKUP_DIR/prerestore-*.dump
# and moves the current uploads folder aside — nothing is deleted.
set -Eeuo pipefail

here=$(cd "$(dirname "$0")" && pwd)
CONF=${BACKUP_CONFIG:-/etc/divineaura/backup.conf}
[ -f "$CONF" ] || CONF="$here/backup.conf"
# shellcheck source=backup.conf
. "$CONF"
umask 027
cd /

pg() { if [ -n "${DB_RUN_AS:-}" ]; then runuser -u "$DB_RUN_AS" -- "$@"; else "$@"; fi; }
die() { echo "ERROR: $*" >&2; exit 1; }
trap 'die "restore stopped — see the message above. A failed database step changes nothing (it is all-or-nothing)."' ERR

if [ $# -eq 0 ]; then
  echo "Backups in $BACKUP_DIR (use the date_time part):"
  ls -1 "$BACKUP_DIR" | sed -n 's/^divineaura-db-\(.*\)\.dump$/  \1/p'
  exit 0
fi

stamp=$1
what=${2:-all}
case "$what" in all | db | uploads) ;; *) die "second argument must be db, uploads or empty" ;; esac
db_file="$BACKUP_DIR/divineaura-db-$stamp.dump"
up_file="$BACKUP_DIR/divineaura-uploads-$stamp.tar.gz"
db_label=${DB_NAME##*/}
db_label=${db_label%%\?*}

# Check the backup files BEFORE touching anything.
if [ "$what" != uploads ]; then
  [ -f "$db_file" ] || die "not found: $db_file"
  pg_restore --list "$db_file" >/dev/null || die "database backup is damaged: $db_file"
fi
if [ "$what" != db ]; then
  [ -f "$up_file" ] || die "not found: $up_file"
  tar -tzf "$up_file" >/dev/null || die "uploads backup is damaged: $up_file"
fi

cat <<EOF

  ██ WARNING — THIS OVERWRITES LIVE DATA ██

  Backup:   $stamp
  Database: $([ "$what" != uploads ] && echo "database '$db_label' will be REPLACED by the backup" || echo "not touched")
  Uploads:  $([ "$what" != db ] && echo "$UPLOADS_DIR will be REPLACED (current folder kept as ${UPLOADS_DIR}.before-restore-…)" || echo "not touched")

  Orders, customers and products created after $stamp will be LOST
  (a copy of the current database is saved first, as prerestore-*.dump).
  Stop the website first:   pm2 stop all

EOF
read -r -p "Type RESTORE (capitals) to continue, anything else cancels: " answer
[ "$answer" = RESTORE ] || { echo "Cancelled. Nothing was changed."; exit 1; }

now=$(TZ="${BACKUP_TIMEZONE:-UTC}" date '+%Y-%m-%d_%H%M%S')

if [ "$what" != uploads ]; then
  safety="$BACKUP_DIR/prerestore-db-$now.dump"
  echo "1/2 Saving the current database to $safety ..."
  pg pg_dump --format=custom --no-password -d "$DB_NAME" >"$safety"
  echo "    Restoring database (all-or-nothing: on any error the database is left unchanged) ..."
  # shellcheck disable=SC2086 # PG_RESTORE_EXTRA is a list of flags
  pg pg_restore --clean --if-exists --single-transaction --exit-on-error --no-password $PG_RESTORE_EXTRA \
    -d "$DB_NAME" <"$db_file"
  echo "    Database restored."
fi

if [ "$what" != db ]; then
  echo "2/2 Restoring uploads ..."
  if [ -e "$UPLOADS_DIR" ]; then
    mv "$UPLOADS_DIR" "${UPLOADS_DIR}.before-restore-$now"
    echo "    Old uploads kept at ${UPLOADS_DIR}.before-restore-$now (delete it once the site looks right)."
  fi
  tar -xzf "$up_file" -C "$(dirname "$UPLOADS_DIR")"
  echo "    Uploads restored ($(find "$UPLOADS_DIR" -type f | wc -l | tr -d ' ') files)."
fi

echo
echo "Done. Start the website again (pm2 start all) and check: home page, a product page, admin orders."
