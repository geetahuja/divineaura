#!/usr/bin/env bash
# Creates / completes the server .env files (as the deploy user):
#   bash deploy/server/setup-env.sh
# Only ADDS missing keys — never changes a value that is already set, so it is safe
# to re-run after new keys appear in .env.example. Secrets are generated here and
# live only in /var/www/divineaura/shared/*.env (chmod 600). Prints key names, never values.
set -euo pipefail
ROOT=/var/www/divineaura
SHARED=$ROOT/shared
DOMAIN=${DOMAIN:-divinesanatani.com}
SITE=https://$DOMAIN
API=https://api.$DOMAIN
BENV=$SHARED/backend.env
SENV=$SHARED/storefront.env
umask 077
touch "$BENV" "$SENV"
chmod 600 "$BENV" "$SENV"

rand() { openssl rand -hex 32; }
added=()
# add FILE KEY VALUE — only when KEY is missing
add() { grep -q "^$2=" "$1" || { printf '%s=%s\n' "$2" "$3" >>"$1"; added+=("$(basename "$1"):$2"); }; }

# ── backend ──
add "$BENV" NODE_ENV production
add "$BENV" SITE_MODE staging
add "$BENV" MEDUSA_BACKEND_URL "$API"
add "$BENV" STOREFRONT_URL "$SITE"
add "$BENV" STORE_CORS "$SITE"
add "$BENV" ADMIN_CORS "$API"
add "$BENV" AUTH_CORS "$SITE,$API"
add "$BENV" COOKIE_DOMAIN ""
add "$BENV" JWT_SECRET "$(rand)"
add "$BENV" COOKIE_SECRET "$(rand)"
add "$BENV" AUTH_MFA_ENCRYPTION_KEY "$(rand)"
add "$BENV" OTP_SECRET "$(rand)"
add "$BENV" COD_CONFIRM_SECRET "$(rand)"
add "$BENV" PAYOUT_ENCRYPTION_KEY "$(rand)"
add "$BENV" FILE_UPLOAD_DIR "$ROOT/uploads"
add "$BENV" FILE_BACKEND_URL "$API/uploads"
add "$BENV" SEED_SAMPLE_PRODUCTS false
# Staging test tools (refused automatically when SITE_MODE=live)
add "$BENV" TEST_PAYMENT_ENABLED true
add "$BENV" TEST_PAYMENT_WEBHOOK_SECRET "$(rand)"
add "$BENV" TEST_COURIER_WEBHOOK_SECRET "$(rand)"
# Pending accounts — fill in per deploy/GO-LIVE.md, then: pm2 restart all --update-env
add "$BENV" RAZORPAY_KEY_ID ""
add "$BENV" RAZORPAY_KEY_SECRET ""
add "$BENV" RAZORPAY_WEBHOOK_SECRET ""
add "$BENV" SHIPROCKET_EMAIL ""
add "$BENV" SHIPROCKET_PASSWORD ""
add "$BENV" SHIPROCKET_PICKUP_LOCATION ""
add "$BENV" SHIPROCKET_WEBHOOK_HEADER x-api-key
add "$BENV" SHIPROCKET_WEBHOOK_TOKEN "$(rand)"
add "$BENV" MESSAGING_CHANNEL console
add "$BENV" OTP_CHANNEL sms
add "$BENV" MSG91_AUTH_KEY ""
add "$BENV" SMS_SENDER_ID ""
add "$BENV" DLT_ENTITY_ID ""
add "$BENV" SMS_TEMPLATE_IDS ""
add "$BENV" WHATSAPP_PROVIDER meta
add "$BENV" WHATSAPP_PHONE_NUMBER_ID ""
add "$BENV" WHATSAPP_ACCESS_TOKEN ""
add "$BENV" MSG91_WHATSAPP_NUMBER ""
add "$BENV" WHATSAPP_TEMPLATE_NAMES ""
add "$BENV" RESEND_API_KEY ""
add "$BENV" EMAIL_FROM "DivineAura <noreply@$DOMAIN>"
add "$BENV" EMAIL_REPLY_TO "support@$DOMAIN"
add "$BENV" SHIPPING_DEFAULT_ITEM_WEIGHT_G 50
add "$BENV" SHIPPING_PACKAGING_WEIGHT_G 50
add "$BENV" BACKUP_STATUS_FILE /var/lib/divineaura-backup/status.json
add "$BENV" BACKUP_ALERT_EMAIL "${BACKUP_ALERT_EMAIL:-}"
add "$BENV" BACKUP_MAX_AGE_HOURS 48

# ── storefront (NEXT_PUBLIC_* are fixed at build time; the rest are read at runtime) ──
add "$SENV" NODE_ENV production
add "$SENV" SITE_MODE staging
add "$SENV" NEXT_PUBLIC_MEDUSA_BACKEND_URL "$API"
add "$SENV" NEXT_PUBLIC_SITE_URL "$SITE"
add "$SENV" NEXT_PUBLIC_DEFAULT_REGION in
add "$SENV" NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ""   # filled by deploy.sh from the database
add "$SENV" GA4_ID ""
add "$SENV" META_PIXEL_ID ""

if ((${#added[@]})); then printf 'Added: %s\n' "${added[@]}"; else echo "Nothing to add."; fi
