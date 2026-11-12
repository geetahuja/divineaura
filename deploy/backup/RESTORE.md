# DivineAura backups — setup and restore

What runs: every night at 02:30 IST the VPS saves the database and the uploads folder
to `/var/backups/divineaura` and keeps 14 days. If a backup fails, or none succeeded in
48 hours, you get an email. Once a week your PC downloads the newest backup.
All paths, times and hosts are in **`/etc/divineaura/backup.conf`** (copy of `deploy/backup/backup.conf`).

## 1. Set up (once, during milestone 13)

On the VPS, from the repo folder:

```bash
sudo bash deploy/backup/install.sh          # scripts, permissions, nightly timer
sudo nano /etc/divineaura/backup.conf       # check DB_NAME, UPLOADS_DIR, ENV_FILES, VPS_SSH_USER
sudo bash deploy/backup/install.sh          # re-run if you changed the user or the time
sudo systemctl start divineaura-backup.service   # first backup now
sudo tail -n 20 /var/log/divineaura-backup.log   # should end with "backup … OK"
```

In `apps/backend/.env` add, then `pm2 reload all`:

```
BACKUP_STATUS_FILE=/var/lib/divineaura-backup/status.json
BACKUP_ALERT_EMAIL=you@example.com
```

Admin → Orders now shows **Last backup: date, size, status** at the top.

Useful: `systemctl list-timers divineaura-backup.timer` (next run) ·
`journalctl -u divineaura-backup` (history).

## 2. Restore

1. Log in to the VPS. See which backups exist:
   `sudo /usr/local/lib/divineaura-backup/restore.sh`
2. Stop the website: `pm2 stop all`
3. Restore (database + uploads), using a date from step 1:
   `sudo /usr/local/lib/divineaura-backup/restore.sh 2026-11-12_0230`
   - only the database: add ` db` · only images: add ` uploads`
4. Read the warning, type `RESTORE`.
   - The current database is saved first as `prerestore-db-….dump` (in the backup folder).
   - The database restore is all-or-nothing: if it fails, nothing changed.
   - Current images are moved to `uploads.before-restore-…`, not deleted.
5. `pm2 start all`, then check the home page, a product page and Admin → Orders.
6. When all is well, delete the `uploads.before-restore-…` folder.

**Restoring on a new server** (VPS lost): set up the server as in milestone 13 (same database
name and user), run `install.sh`, copy the two backup files from your PC into
`/var/backups/divineaura/` with `scp`, then follow the steps above.

**Practice once before launch** (ARCHITECTURE.md §18) — ideally on a fresh Hostinger snapshot.

## 3. Copy to your PC (weekly)

Already set up: `VPS_HOST="divineaura"` uses the `Host divineaura` entry in `~/.ssh/config`
(dedicated `divineaura_ed25519` key, user `deploy`). Optional: a separate restricted key just for
downloads — one time, in PowerShell on your PC:

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\divineaura_backup -N '""'     # key without password, used only for this
type $HOME\.ssh\divineaura_backup.pub                              # copy the line it prints
```

On the VPS, as the SSH user from `VPS_SSH_USER`, add that line to `~/.ssh/authorized_keys`
starting with `restrict ` (so the key cannot open a shell window or forwarding).
Then on the PC add to `$HOME\.ssh\config`:

```
Host divineaura-backup
  HostName 189.72.151.83
  User deploy
  IdentityFile ~/.ssh/divineaura_backup
  IdentitiesOnly yes
```

Then set `VPS_HOST="divineaura-backup"` (and `LOCAL_BACKUP_DIR` if not `D:\DivineAura-Backups`) in `deploy\backup\backup.conf`,
then run it once by hand (this also accepts the server's key):

```powershell
powershell -ExecutionPolicy Bypass -File D:\Projects\divineaura\deploy\backup\backup-download.ps1
```

Schedule it every Sunday 10:00 (runs later if the PC was off):

```powershell
$a = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -File "D:\Projects\divineaura\deploy\backup\backup-download.ps1"'
$t = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 10am
Register-ScheduledTask -TaskName "DivineAura backup download" -Action $a -Trigger $t -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable)
```

Check `D:\DivineAura-Backups\download.log` now and then. It keeps the newest 8 copies.
Copy one to an external drive every month or so.

## 4. Secrets (.env files)

The database backup does **not** contain the `.env` files (API keys, Razorpay, secrets).
After setup and after every `.env` change:

```bash
sudo /usr/local/lib/divineaura-backup/secrets-backup.sh     # asks for a password twice
```

Download the file it prints (`scp user@host:/var/backups/divineaura/secrets/env-….gpg .`), then:

- Store the file on your PC **and** on a USB drive kept at home. Never on GitHub, email or chat.
- Store the password in a password manager (e.g. Bitwarden, free) — **not** next to the file.
  Without the password the file cannot be opened; there is no recovery.
- To open it (Git Bash on Windows or Linux): `gpg -d env-….tar.gz.gpg | tar -xzvf -`

## If you get a "backup problem" email

1. `sudo tail -n 50 /var/log/divineaura-backup.log` — the last lines say which step failed.
2. Common causes: disk full (`df -h`), PostgreSQL stopped (`systemctl status postgresql`),
   uploads folder moved (fix `UPLOADS_DIR`).
3. Fix it, then `sudo systemctl start divineaura-backup.service` and check the log again.
