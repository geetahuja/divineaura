<#
  Weekly off-server copy of DivineAura backups to this Windows PC (ARCHITECTURE.md section 18).
  Downloads the newest backup (database + uploads) from the VPS over SSH (scp) if it is
  newer than the last one downloaded, into <LOCAL_BACKUP_DIR>\<date_time>\, keeps the
  newest KEEP_WEEKLY copies, copies any new encrypted secrets backups (secrets\, never pruned) and logs to <LOCAL_BACKUP_DIR>\download.log.
  Settings come from backup.conf (VPS_HOST, VPS_SSH_USER, VPS_SSH_PORT, BACKUP_DIR,
  LOCAL_BACKUP_DIR, KEEP_WEEKLY). Needs an SSH key login that works without typing
  a password (see RESTORE.md, "Copy to your PC").

  powershell -ExecutionPolicy Bypass -File backup-download.ps1 [-Dest E:\Backups]
#>
param(
  [string]$Config = (Join-Path $PSScriptRoot 'backup.conf'),
  [string]$Dest
)
$ErrorActionPreference = 'Stop'

$cfg = @{}
foreach ($line in Get-Content $Config) {
  if ($line -match '^\s*([A-Z_]+)="?(.*?)"?\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}
if (-not $Dest) { $Dest = $cfg.LOCAL_BACKUP_DIR }
$keep = [int]$cfg.KEEP_WEEKLY
$remote = "$($cfg.VPS_SSH_USER)@$($cfg.VPS_HOST)"
$port = $cfg.VPS_SSH_PORT
$dir = $cfg.BACKUP_DIR
New-Item -ItemType Directory -Force $Dest | Out-Null
$logFile = Join-Path $Dest 'download.log'
$stateFile = Join-Path $Dest 'last-download.txt'

function Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  Write-Host $line
  Add-Content -Path $logFile -Value $line -Encoding utf8
}

# Newest backup on the VPS (file names sort by date: divineaura-db-2026-11-12_0230.dump).
$names = & ssh -p $port -o BatchMode=yes $remote "ls -1 '$dir'"
if ($LASTEXITCODE -ne 0) { Log "ERROR: could not list $dir on $remote (ssh exit $LASTEXITCODE)"; exit 1 }

# Encrypted .env backups (secrets-backup.sh): fetch any not yet on this PC. Never pruned.
$secDest = Join-Path $Dest 'secrets'
New-Item -ItemType Directory -Force $secDest | Out-Null
$secNames = & ssh -p $port -o BatchMode=yes $remote "ls -1 '$dir/secrets' 2>/dev/null"
foreach ($f in $secNames | Where-Object { $_ -match '^env-[\d_-]+\.tar\.gz\.gpg$' }) {
  $local = Join-Path $secDest $f
  if (Test-Path $local) { continue }
  & scp -P $port -o BatchMode=yes "${remote}:$dir/secrets/$f" "$secDest\"
  if ($LASTEXITCODE -ne 0) { Log "ERROR: download of secrets/$f failed (scp exit $LASTEXITCODE)"; Remove-Item $local -Force -ErrorAction SilentlyContinue; continue }
  Log "Downloaded secrets/$f"
}
$latest = $names | Where-Object { $_ -match '^divineaura-db-(.+)\.dump$' } | ForEach-Object { $Matches[1] } | Sort-Object | Select-Object -Last 1
if (-not $latest) { Log "ERROR: no backups found in $dir on $remote"; exit 1 }

$last = if (Test-Path $stateFile) { (Get-Content $stateFile -Raw).Trim() } else { '' }
if ([string]::CompareOrdinal($latest, $last) -le 0) { Log "Nothing new: newest backup $latest was already downloaded."; exit 0 }

$folder = Join-Path $Dest $latest
New-Item -ItemType Directory -Force $folder | Out-Null
foreach ($f in "divineaura-db-$latest.dump", "divineaura-uploads-$latest.tar.gz") {
  & scp -P $port -o BatchMode=yes "${remote}:$dir/$f" "$folder\"
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: download of $f failed (scp exit $LASTEXITCODE); removed the incomplete copy."
    Remove-Item $folder -Recurse -Force
    exit 1
  }
  Log ("Downloaded {0} ({1:N1} MB)" -f $f, ((Get-Item (Join-Path $folder $f)).Length / 1MB))
}
Set-Content -Path $stateFile -Value $latest

# Keep the newest $keep copies (folder names are date_time, so name order = date order).
Get-ChildItem $Dest -Directory | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{4}$' } |
  Sort-Object Name -Descending | Select-Object -Skip $keep | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Log "Removed old copy $($_.Name) (keeping $keep)"
  }
Log "OK: backup $latest saved to $folder"
