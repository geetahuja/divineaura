#!/usr/bin/env bash
# REQUIRED before going live (deploy/GO-LIVE.md §9): deletes every order made on
# staging and resets the numbering, so the first real order is #1 and the first
# real invoice is AS/26-27/00001 (credit notes CN/…/00001, bills of supply BOS/…/00001).
#   ssh -t divineaura "bash /var/www/divineaura/app/deploy/server/reset-test-orders.sh"
#
# Deletes ALL orders, carts, payments, fulfillments, stock reservations, invoices,
# credit notes, number counters, shipments + timelines, COD confirmations, return
# requests, reviews and the message log. Keeps products, stock levels, customers,
# categories, pages, settings, admin users and uploads.
# Safety: only while SITE_MODE=staging; asks you to type a confirmation; takes a
# backup first; runs in ONE transaction (any error → nothing is changed).
set -euo pipefail
SHARED=/var/www/divineaura/shared
grep -q '^SITE_MODE=staging$' "$SHARED/backend.env" || { echo "Refusing: SITE_MODE is not staging (run this BEFORE switching to live)."; exit 1; }
DB=$(grep -oP '^DATABASE_URL=\K.*' "$SHARED/backend.env")

count() { psql "$DB" -tAc 'select (select count(*) from "order") || '"' orders, '"' || (select count(*) from invoice) || '"' invoices, '"' || (select count(*) from credit_note) || '"' credit notes'"; }
echo "Now on staging: $(count)"
if [ "${1:-}" != "--yes" ]; then
  read -r -p "Type DELETE TEST ORDERS to delete all of them and reset numbering: " answer
  [ "$answer" = "DELETE TEST ORDERS" ] || { echo "Cancelled. Nothing was changed."; exit 1; }
fi

echo "Backup first ..."
sudo systemctl start divineaura-backup.service
echo "  $(sudo tail -n 1 /var/log/divineaura-backup.log)"

# Explicit table list, no CASCADE: if any other table still referenced these rows,
# Postgres would refuse and the transaction would change nothing.
# Order / claim / exchange numbers restart at 1.
psql "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
BEGIN;
TRUNCATE TABLE
  -- orders (Medusa order module) and its links
  "order", order_address, order_change, order_change_action, order_claim, order_claim_item,
  order_claim_item_image, order_credit_line, order_exchange, order_exchange_item, order_item,
  order_line_item, order_line_item_adjustment, order_line_item_tax_line, order_shipping,
  order_shipping_method, order_shipping_method_adjustment, order_shipping_method_tax_line,
  order_summary, order_transaction, return, return_item,
  order_cart, order_fulfillment, order_payment_collection, order_promotion, return_fulfillment,
  -- carts
  cart, cart_address, cart_line_item, cart_line_item_adjustment, cart_line_item_tax_line,
  cart_payment_collection, cart_promotion, cart_shipping_method, cart_shipping_method_adjustment,
  cart_shipping_method_tax_line, credit_line,
  -- payments, fulfillments, stock reservations
  payment_collection, payment_collection_payment_providers, payment_session, payment, capture, refund,
  fulfillment, fulfillment_address, fulfillment_item, fulfillment_label,
  reservation_item,
  -- custom modules: documents + numbering, shipping, COD, returns, reviews, messages
  invoice, credit_note, doc_counter,
  shipment, order_event,
  cod_confirmation, return_request,
  review, review_request,
  message_log
RESTART IDENTITY;
ALTER SEQUENCE order_display_id_seq RESTART WITH 1;
ALTER SEQUENCE order_claim_display_id_seq RESTART WITH 1;
ALTER SEQUENCE order_exchange_display_id_seq RESTART WITH 1;
-- Rebrand (2026-11-13): DA/… test invoices are gone; real numbering uses AS/….
UPDATE business_settings SET invoice_prefix = 'AS' WHERE invoice_prefix = 'DA';
COMMIT;
SQL

echo "Done: $(count)."
echo "Next order: #1"
PREFIX=$(psql "$DB" -tAc "select invoice_prefix from business_settings limit 1")
echo "Next invoice: ${PREFIX:-AS}/<financial year>/00001 (counters cleared)."
echo "Check stock levels in Admin → Inventory: shipped test orders reduced them."
