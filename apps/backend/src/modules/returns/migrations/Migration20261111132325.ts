import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111132325 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "return_request" ("id" text not null, "order_id" text not null, "order_number" integer not null, "status" text check ("status" in ('requested', 'approved', 'rejected', 'received', 'refunded')) not null default 'requested', "items" jsonb not null, "reason" text not null, "details" text null, "photos" jsonb null, "refund_amount" numeric not null, "refund_method" text check ("refund_method" in ('original', 'manual')) not null, "payout_encrypted" text null, "payout_hint" text null, "admin_note" text null, "pickup_awb" text null, "pickup_courier" text null, "refunded_at" timestamptz null, "raw_refund_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_deleted_at" ON "return_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_order_id" ON "return_request" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_request_status" ON "return_request" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "return_request" cascade;`);
  }

}
