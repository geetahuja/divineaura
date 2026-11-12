#!/usr/bin/env bash
# Nightly DivineAura backup (ARCHITECTURE.md §18): database + uploads → $BACKUP_DIR.
# Run by divineaura-backup.timer (see install.sh). Exits non-zero on any failure and
# records the result in $STATUS_FILE, which the backend reads for alerts + the admin widget.
# Config: $BACKUP_CONFIG, else /etc/divineaura/backup.conf, else backup.conf next to this script.
set -Eeuo pipefail

here=$(cd "$(dirname "$0")" && pwd)
CONF=${BACKUP_CONFIG:-/etc/divineaura/backup.conf}
[ -f "$CONF" ] || CONF="$here/backup.conf"
# shellcheck source=backup.conf
. "$CONF"

umask 027 # new files: owner rw, backup group r, nobody else
mkdir -p "$BACKUP_DIR" "$(dirname "$STATUS_FILE")" "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1
cd /

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "$(ts) $*"; }
size() { du -h "$1" | cut -f1; }
bytes() { wc -c <"$1" | tr -d ' '; }
pg() { if [ -n "${DB_RUN_AS:-}" ]; then runuser -u "$DB_RUN_AS" -- "$@"; else "$@"; fi; }

stamp=$(TZ="${BACKUP_TIMEZONE:-UTC}" date '+%Y-%m-%d_%H%M')
db_file="$BACKUP_DIR/divineaura-db-$stamp.dump"
up_file="$BACKUP_DIR/divineaura-uploads-$stamp.tar.gz"
step="start"

# status.json: tiny, no secrets; readable by the backend user.
write_status() { # status error db_bytes uploads_bytes
  local prev last_ok now tmp="$STATUS_FILE.tmp"
  now=$(date -Iseconds)
  prev=$(grep -o '"last_success_at": *"[^"]*"' "$STATUS_FILE" 2>/dev/null | cut -d'"' -f4 || true)
  last_ok=$([ "$1" = ok ] && echo "$now" || echo "$prev")
  printf '{"status":"%s","finished_at":"%s","last_success_at":%s,"backup":"%s","db_bytes":%s,"uploads_bytes":%s,"error":%s}\n' \
    "$1" "$now" "$([ -n "$last_ok" ] && echo "\"$last_ok\"" || echo null)" "$stamp" "${3:-0}" "${4:-0}" \
    "$([ -n "$2" ] && echo "\"${2//\"/\'}\"" || echo null)" >"$tmp"
  chmod 644 "$tmp" && mv -f "$tmp" "$STATUS_FILE"
}

fail() {
  trap - ERR
  log "BACKUP FAILED: $1" >&2 # stderr: stdout may be redirected into the dump file right now
  rm -f "$db_file" "$up_file" # never leave a half-written backup that looks valid
  write_status failed "$1" || true
  exit 1
}
trap 'fail "step \"$step\" failed"' ERR

db_label=${DB_NAME##*/} # never log a URI: it may hold a password
log "── backup $stamp start (db=${db_label%%\?*}, keep ${KEEP_DAYS} days)"

step="database dump"
pg pg_dump --format=custom --compress=6 --no-password -d "$DB_NAME" >"$db_file"

step="database dump check"
toc=$(pg_restore --list "$db_file" | awk '!/^;/{n++} END{print n+0}')
[ "${toc:-0}" -gt 0 ] || fail "dump has no restorable objects"
log "database: $(size "$db_file")  $db_file  ($toc objects, pg_restore --list OK)"

step="uploads archive"
[ -d "$UPLOADS_DIR" ] || fail "uploads folder not found: $UPLOADS_DIR"
tar -czf "$up_file" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
step="uploads archive check"
files=$(tar -tzf "$up_file" | awk '!/\/$/{n++} END{print n+0}')
log "uploads:  $(size "$up_file")  $up_file  ($files files, tar -tzf OK)"

# Prune only after a good backup, so a run of failures can never delete the last good copy.
step="prune"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'divineaura-*' -o -name 'prerestore-*' \) \
  -mmin +$((KEEP_DAYS * 1440)) -print -delete | sed "s/^/$(ts) deleted old: /"

write_status ok "" "$(bytes "$db_file")" "$(bytes "$up_file")"
log "── backup $stamp OK ($(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR)"
