#!/usr/bin/env bash
# The one switch between staging and live (deploy/GO-LIVE.md):
#   sudo bash /var/www/divineaura/app/deploy/server/site-mode.sh staging|live
# staging: password on the storefront + admin UI, noindex everywhere, robots.txt
#          Disallow all, "STAGING – test orders only" banner, analytics off, test
#          payment gateway + test courier allowed.
# live:    all of that removed; the test gateway / courier refuse to load.
# Sets SITE_MODE in both .env files, rewrites the Nginx snippets, reloads Nginx and
# restarts the apps. No rebuild. The basic-auth password is created once and printed
# only then (reset: sudo rm /etc/nginx/divineaura/htpasswd and run again).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo"; exit 1; }
MODE=${1:-}
[ "$MODE" = staging ] || [ "$MODE" = live ] || { echo "Usage: $0 staging|live"; exit 1; }
SHARED=/var/www/divineaura/shared
SNIP=/etc/nginx/divineaura
HT=$SNIP/htpasswd
USER_NAME=${STAGING_USER:-divine}
install -d -m 755 "$SNIP"

for f in "$SHARED/backend.env" "$SHARED/storefront.env"; do
  if grep -q '^SITE_MODE=' "$f"; then sed -i "s/^SITE_MODE=.*/SITE_MODE=$MODE/" "$f"; else echo "SITE_MODE=$MODE" >>"$f"; fi
done

if [ "$MODE" = staging ]; then
  if [ ! -f "$HT" ]; then
    PASS=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
    htpasswd -bcB "$HT" "$USER_NAME" "$PASS" 2>/dev/null
    chown root:www-data "$HT" && chmod 640 "$HT"
    echo "Staging password created — shown ONCE, save it now:"
    echo "  user:     $USER_NAME"
    echo "  password: $PASS"
  fi
  cat >"$SNIP/storefront-server.conf" <<EOF
# STAGING (site-mode.sh): password + keep search engines out
auth_basic "Anant Sanatan staging";
auth_basic_user_file $HT;
location = /robots.txt { auth_basic off; default_type text/plain; add_header X-Robots-Tag "noindex, nofollow" always; return 200 "User-agent: *\nDisallow: /\n"; }
EOF
  # The banner is CSS only (no extra DOM node), so React hydration is untouched.
  cat >"$SNIP/storefront-location.conf" <<'EOF'
# STAGING (site-mode.sh): noindex + banner injected into every HTML page
add_header X-Robots-Tag "noindex, nofollow" always;
proxy_set_header Accept-Encoding "";
sub_filter_once on;
sub_filter '</head>' '<style id="da-staging">body::before{content:"STAGING \2013  test orders only";display:block;background:#C58A36;color:#2b1a0e;font:700 13px/1.3 system-ui,sans-serif;text-align:center;padding:6px 8px;letter-spacing:.02em}</style></head>';
EOF
  cat >"$SNIP/api-private.conf" <<EOF
# STAGING (site-mode.sh): password on the admin UI (on top of the admin login)
auth_basic "Anant Sanatan staging";
auth_basic_user_file $HT;
EOF
else
  for f in storefront-server storefront-location api-private; do echo "# live: nothing here (site-mode.sh)" >"$SNIP/$f.conf"; done
fi

{ nginx -t -q || exit 1; } && systemctl reload nginx
sudo -u deploy -H bash -c 'cd ~ && pm2 restart all --update-env >/dev/null && pm2 save >/dev/null' || echo "(apps not running yet)"
echo "SITE_MODE=$MODE applied."
