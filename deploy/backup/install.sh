#!/usr/bin/env bash
# One-time setup of nightly backups on the VPS (milestone 13):
#   sudo bash deploy/backup/install.sh
# Safe to re-run (e.g. after changing BACKUP_TIME): it never overwrites an edited
# /etc/divineaura/backup.conf.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo: sudo bash $0"; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)
CONF=/etc/divineaura/backup.conf
LIB=/usr/local/lib/divineaura-backup

install -d -m 755 /etc/divineaura
if [ -f "$CONF" ]; then echo "Keeping existing $CONF"; else install -m 644 "$here/backup.conf" "$CONF"; echo "Installed $CONF — check the paths in it."; fi
# shellcheck source=backup.conf
. "$CONF"

for cmd in pg_dump pg_restore tar gpg runuser; do command -v "$cmd" >/dev/null || { echo "Missing $cmd (apt install postgresql-client gnupg)"; exit 1; }; done

install -d -m 755 "$LIB"
install -m 755 "$here/backup.sh" "$here/restore.sh" "$here/secrets-backup.sh" "$LIB/"

# Backups: root writes, $BACKUP_GROUP reads (setgid dir so new files get the group), others nothing.
getent group "$BACKUP_GROUP" >/dev/null || groupadd --system "$BACKUP_GROUP"
if id "$VPS_SSH_USER" >/dev/null 2>&1; then usermod -aG "$BACKUP_GROUP" "$VPS_SSH_USER"; echo "Added $VPS_SSH_USER to $BACKUP_GROUP (can download backups)"; fi
install -d -o root -g "$BACKUP_GROUP" -m 2750 "$BACKUP_DIR"
chown -R root:"$BACKUP_GROUP" "$BACKUP_DIR" && chmod -R g-w,o-rwx "$BACKUP_DIR"
install -d -m 755 "$(dirname "$STATUS_FILE")"

cat >/etc/systemd/system/divineaura-backup.service <<EOF
[Unit]
Description=DivineAura backup (database + uploads)
After=postgresql.service

[Service]
Type=oneshot
ExecStart=$LIB/backup.sh
Nice=10
IOSchedulingClass=idle
EOF

# Persistent=true: if the server was off at $BACKUP_TIME, run as soon as it is back on.
cat >/etc/systemd/system/divineaura-backup.timer <<EOF
[Unit]
Description=Nightly DivineAura backup at $BACKUP_TIME $BACKUP_TIMEZONE

[Timer]
OnCalendar=*-*-* $BACKUP_TIME:00 $BACKUP_TIMEZONE
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now divineaura-backup.timer
systemctl list-timers divineaura-backup.timer --no-pager
cat <<EOF

Installed. Next:
  1. Run the first backup now:   sudo systemctl start divineaura-backup.service
  2. Check it:                   sudo tail -n 20 $LOG_FILE   (or: journalctl -u divineaura-backup)
  3. In apps/backend/.env set:   BACKUP_STATUS_FILE=$STATUS_FILE  and  BACKUP_ALERT_EMAIL=you@…
  4. Test a restore once (RESTORE.md).
EOF
