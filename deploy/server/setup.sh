#!/usr/bin/env bash
# One-time (and safely re-runnable) VPS setup — ARCHITECTURE.md §18.
#   sudo bash deploy/server/setup.sh
# Ubuntu 26.04 LTS. Installs Node 24 (NodeSource), pnpm (corepack), PostgreSQL,
# Redis, Nginx (+brotli), Certbot, PM2; hardens the box (deploy user, UFW,
# fail2ban, unattended upgrades, swap, timezone). Never prints secrets.
# SSH lock-down (no root / no passwords) is a separate step: harden-ssh.sh.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run as root: sudo bash $0"; exit 1; }

DEPLOY_USER=${DEPLOY_USER:-deploy}
ROOT=/var/www/divineaura          # repo/, releases/, app -> current release, shared/ (.env), uploads/
NODE_MAJOR=24
PNPM_VERSION=12.4.1               # = packageManager in package.json
SWAP_GB=4                         # KVM 2: 8 GB RAM; swap covers next build peaks
export DEBIAN_FRONTEND=noninteractive

log() { printf '\n== %s\n' "$*"; }
rand() { openssl rand -hex 32; }

log "Timezone + swap"
timedatectl set-timezone Asia/Kolkata
if ! swapon --show | grep -q /swapfile; then
  fallocate -l ${SWAP_GB}G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi
echo 'vm.swappiness=10' >/etc/sysctl.d/99-divineaura.conf && sysctl -q --system

log "Packages"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git build-essential openssl \
  ufw fail2ban unattended-upgrades apache2-utils \
  postgresql redis-server nginx libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static \
  certbot python3-certbot-nginx >/dev/null
if ! node -v 2>/dev/null | grep -q "^v${NODE_MAJOR}\."; then
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" >/etc/apt/sources.list.d/nodesource.list
  printf 'Package: nodejs\nPin: origin deb.nodesource.com\nPin-Priority: 1001\n' >/etc/apt/preferences.d/nodesource
  apt-get update -qq && apt-get install -y -qq nodejs >/dev/null
fi
npm install -g -s corepack@latest pm2@latest >/dev/null
corepack enable
echo "node $(node -v), pm2 $(pm2 -v)"

log "Unattended security upgrades"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

log "Deploy user ($DEPLOY_USER)"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
fi
usermod -aG sudo "$DEPLOY_USER"
# Key-only login and no password set, so sudo can't ask for one.
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-$DEPLOY_USER && chmod 440 /etc/sudoers.d/90-$DEPLOY_USER
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /home/$DEPLOY_USER/.ssh
AK=/home/$DEPLOY_USER/.ssh/authorized_keys
touch "$AK"
# Same key(s) root accepts today (the owner's divineaura key) — appended once.
while read -r line; do [ -n "$line" ] && ! grep -qxF "$line" "$AK" && echo "$line" >>"$AK"; done </root/.ssh/authorized_keys
chown "$DEPLOY_USER:$DEPLOY_USER" "$AK" && chmod 600 "$AK"
sudo -u "$DEPLOY_USER" -H bash -c "cd ~ && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare pnpm@$PNPM_VERSION --activate >/dev/null && pnpm -v >/dev/null"

log "Firewall + fail2ban"
ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
for p in 22/tcp 80/tcp 443/tcp; do ufw allow $p >/dev/null; done
ufw --force enable >/dev/null
cat >/etc/fail2ban/jail.d/divineaura.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban >/dev/null && systemctl restart fail2ban

log "Folders"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" $ROOT $ROOT/releases $ROOT/uploads
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" $ROOT/shared
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /var/log/divineaura

# Secrets live only in the app .env files (chmod 600). Generated once; re-runs reuse them.
BENV=$ROOT/shared/backend.env
getkey() { [ -f "$BENV" ] && grep -oP "^$1=\K.*" "$BENV" || true; }
DB_PASS=$(getkey DB_PASSWORD); DB_PASS=${DB_PASS:-$(rand)}
REDIS_PASS=$(getkey REDIS_PASSWORD); REDIS_PASS=${REDIS_PASS:-$(rand)}

log "PostgreSQL (localhost only)"
systemctl enable --now postgresql >/dev/null
PGV=$(ls /etc/postgresql | sort -n | tail -1)
grep -Eq "^\s*listen_addresses" /etc/postgresql/$PGV/main/postgresql.conf \
  || echo "listen_addresses = 'localhost'" >>/etc/postgresql/$PGV/main/postgresql.conf
runuser -u postgres -- psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname='divineaura'" | grep -q 1 \
  || runuser -u postgres -- psql -qc "CREATE ROLE divineaura LOGIN"
runuser -u postgres -- psql -q -v pw="$DB_PASS" <<'SQL'
ALTER ROLE divineaura WITH PASSWORD :'pw';
SQL
runuser -u postgres -- psql -qtAc "SELECT 1 FROM pg_database WHERE datname='divineaura'" | grep -q 1 \
  || runuser -u postgres -- createdb -O divineaura divineaura
systemctl restart postgresql

log "Redis (localhost only, password)"
RC=/etc/redis/redis.conf
sed -i -E 's/^#?\s*bind .*/bind 127.0.0.1 -::1/; s/^#?\s*protected-mode .*/protected-mode yes/; s/^#?\s*supervised .*/supervised systemd/' $RC
sed -i -E '/^#?\s*requirepass /d' $RC && echo "requirepass $REDIS_PASS" >>$RC
grep -q '^maxmemory ' $RC || printf 'maxmemory 512mb\nmaxmemory-policy noeviction\n' >>$RC
chmod 640 $RC && chown redis:redis $RC
systemctl enable --now redis-server >/dev/null && systemctl restart redis-server

# Hand the generated DB/Redis credentials to the app env (setup-env.sh adds the rest).
touch "$BENV" && chown "$DEPLOY_USER:$DEPLOY_USER" "$BENV" && chmod 600 "$BENV"
setkey() { if grep -q "^$1=" "$BENV"; then sed -i "s|^$1=.*|$1=$2|" "$BENV"; else echo "$1=$2" >>"$BENV"; fi; }
setkey DB_PASSWORD "$DB_PASS"
setkey REDIS_PASSWORD "$REDIS_PASS"
setkey DATABASE_URL "postgres://divineaura:$DB_PASS@127.0.0.1:5432/divineaura"
setkey REDIS_URL "redis://:$REDIS_PASS@127.0.0.1:6379"

log "Nginx + PM2 boot"
systemctl enable --now nginx >/dev/null
env PATH="$PATH" pm2 startup systemd -u "$DEPLOY_USER" --hp /home/$DEPLOY_USER >/dev/null
sudo -u "$DEPLOY_USER" -H bash -c 'cd ~; pm2 ls >/dev/null; pm2 describe pm2-logrotate >/dev/null 2>&1 || pm2 install pm2-logrotate >/dev/null
  pm2 set pm2-logrotate:max_size 20M >/dev/null; pm2 set pm2-logrotate:retain 14 >/dev/null; pm2 set pm2-logrotate:compress true >/dev/null'

log "Done"
echo "postgres $PGV, redis $(redis-server --version | grep -oP 'v=\K\S+'), nginx $(nginx -v 2>&1 | cut -d/ -f2), node $(node -v)"
ss -tlnp | awk 'NR>1{print $4}' | sort -u | tr '\n' ' '; echo
