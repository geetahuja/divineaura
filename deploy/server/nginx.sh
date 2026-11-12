#!/usr/bin/env bash
# Nginx + Let's Encrypt for divinesanatani.com (ARCHITECTURE.md §0, §18). Re-runnable:
#   sudo DOMAIN=divinesanatani.com [CERT_EMAIL=you@example.com] bash deploy/server/nginx.sh
# 1. HTTP-only config (ACME challenge) → certbot (webroot) for apex, www and api.
# 2. Full config: www → apex 301, storefront :3000, API :9000, /uploads from disk,
#    gzip + brotli, cache headers, upload limit, rate limits on OTP / login.
# Staging vs live (password, noindex, banner) lives in /etc/nginx/divineaura/*.conf,
# written by site-mode.sh — this script never touches those.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo"; exit 1; }
DOMAIN=${DOMAIN:-divinesanatani.com}
CERT_EMAIL=${CERT_EMAIL:-} # optional: expiry notices (renewal is automatic either way)
ROOT=/var/www/divineaura
ACME=/var/www/letsencrypt
CONF=/etc/nginx/sites-available/divineaura.conf
SNIP=/etc/nginx/divineaura
install -d -m 755 "$ACME" "$SNIP"
for f in storefront-server storefront-location api-private; do [ -f "$SNIP/$f.conf" ] || echo "# live: nothing here (site-mode.sh)" >"$SNIP/$f.conf"; done
rm -f /etc/nginx/sites-enabled/default

# Resolve check: every host must point at this server before asking for certificates.
ME=$(curl -fsS -4 -m 10 https://api.ipify.org || hostname -I | awk '{print $1}')
for h in "$DOMAIN" "www.$DOMAIN" "api.$DOMAIN"; do
  ip=$(getent ahostsv4 "$h" | awk 'NR==1{print $1}')
  [ "$ip" = "$ME" ] || { echo "DNS: $h → '${ip:-nothing}', expected $ME. Fix DNS first."; exit 1; }
done

http_only() {
  cat >"$CONF" <<EOF
server {
  listen 80; listen [::]:80;
  server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
  location /.well-known/acme-challenge/ { root $ACME; }
  location / { return 301 https://\$host\$request_uri; }
}
EOF
  ln -sfn "$CONF" /etc/nginx/sites-enabled/divineaura.conf
  { nginx -t -q || exit 1; } && systemctl reload nginx
}

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  http_only
  certbot certonly --webroot -w "$ACME" -d "$DOMAIN" -d "www.$DOMAIN" -d "api.$DOMAIN" \
    --cert-name "$DOMAIN" $([ -n "$CERT_EMAIL" ] && echo "--email $CERT_EMAIL" || echo --register-unsafely-without-email) --agree-tos --no-eff-email --non-interactive \
    --deploy-hook "systemctl reload nginx"
fi

cat >/etc/nginx/conf.d/divineaura-http.conf <<'EOF'
# DivineAura — http-level settings (deploy/server/nginx.sh)
ssl_session_cache shared:DA_SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
gzip_vary on; gzip_proxied any; gzip_comp_level 5; gzip_min_length 512;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml application/rss+xml image/svg+xml application/manifest+json text/x-component;
brotli on; brotli_comp_level 5; brotli_min_length 512;
brotli_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml application/rss+xml image/svg+xml application/manifest+json text/x-component;
# Per-IP limits (the backend has its own per-phone OTP limits as well)
limit_req_zone $binary_remote_addr zone=da_otp:10m rate=6r/m;
limit_req_zone $binary_remote_addr zone=da_login:10m rate=12r/m;
limit_req_status 429;
EOF

cat >"$CONF" <<EOF
# DivineAura (deploy/server/nginx.sh) — staging/live parts: $SNIP/*.conf (site-mode.sh)
map \$http_upgrade \$da_connection { default upgrade; '' close; }

server {
  listen 80; listen [::]:80;
  server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
  location /.well-known/acme-challenge/ { root $ACME; }
  location / { return 301 https://\$host\$request_uri; }
}

# www → apex
server {
  listen 443 ssl; listen [::]:443 ssl; http2 on;
  server_name www.$DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  return 301 https://$DOMAIN\$request_uri;
}

# Storefront
server {
  listen 443 ssl; listen [::]:443 ssl; http2 on;
  server_name $DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  add_header Strict-Transport-Security "max-age=31536000" always;
  client_max_body_size 16m; # review / return photos go through server actions (4 MB each)

  include $SNIP/storefront-server.conf; # staging: password + robots.txt Disallow

  location = /api/health { auth_basic off; proxy_pass http://127.0.0.1:3000; access_log off; }

  # Hashed build assets: served from disk, cached for a year.
  location /_next/static/ {
    alias $ROOT/app/apps/storefront/.next/static/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
  }

  location / {
    include $SNIP/storefront-location.conf; # staging: noindex header + banner
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$da_connection;
    proxy_read_timeout 60s;
  }
}

# API + admin
server {
  listen 443 ssl; listen [::]:443 ssl; http2 on;
  server_name api.$DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Robots-Tag "noindex, nofollow" always; # the API is never meant for search
  client_max_body_size 16m; # product images (admin) and customer photos

  # Uploaded images straight from disk (FILE_BACKEND_URL=https://api.$DOMAIN/uploads)
  location /uploads/ {
    alias $ROOT/uploads/;
    add_header Cache-Control "public, max-age=2592000";
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-Content-Type-Options nosniff always;
    access_log off;
  }

  # Admin UI: staging password on top of the admin login (site-mode.sh).
  location /app {
    include $SNIP/api-private.conf;
    include /etc/nginx/divineaura-proxy-api.conf;
  }

  location /store/otp/ {
    limit_req zone=da_otp burst=4 nodelay;
    include /etc/nginx/divineaura-proxy-api.conf;
  }
  location /auth/ {
    limit_req zone=da_login burst=10 nodelay;
    include /etc/nginx/divineaura-proxy-api.conf;
  }

  # Everything else: /store (storefront), /admin API (admin login), /hooks (payment +
  # courier webhooks, verified by signature), /health, /documents (signed links).
  location / {
    include /etc/nginx/divineaura-proxy-api.conf;
  }
}
EOF

cat >/etc/nginx/divineaura-proxy-api.conf <<'EOF'
proxy_pass http://127.0.0.1:9000;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto https;
proxy_read_timeout 120s;
EOF

ln -sfn "$CONF" /etc/nginx/sites-enabled/divineaura.conf
{ nginx -t -q || exit 1; } && systemctl reload nginx
echo "Nginx ready for $DOMAIN, www.$DOMAIN, api.$DOMAIN"
certbot renew --dry-run --no-random-sleep-on-renew --cert-name "$DOMAIN" 2>&1 | grep -E "Congratulations|simulated renewal|fail" || true
