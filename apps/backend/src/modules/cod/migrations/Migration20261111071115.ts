import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111071115 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "cod_confirmation" drop constraint if exists "cod_confirmation_order_id_unique";`);
    this.addSql(`alter table if exists "cod_blocked_pincode" drop constraint if exists "cod_blocked_pincode_pincode_unique";`);
    this.addSql(`create table if not exists "cod_blocked_pincode" ("id" text not null, "pincode" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cod_blocked_pincode_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cod_blocked_pincode_pincode_unique" ON "cod_blocked_pincode" ("pincode") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_blocked_pincode_deleted_at" ON "cod_blocked_pincode" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "cod_confirmation" ("id" text not null, "order_id" text not null, "status" text check ("status" in ('pending', 'confirmed', 'cancelled')) not null default 'pending', "expires_at" timestamptz not null, "confirmed_at" timestamptz null, "confirmed_by" text check ("confirmed_by" in ('customer', 'admin')) null, "cancelled_at" timestamptz null, "cancel_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cod_confirmation_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cod_confirmation_order_id_unique" ON "cod_confirmation" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_confirmation_deleted_at" ON "cod_confirmation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "payment_settings" ("id" text not null, "cod_enabled" boolean not null default true, "cod_fee" integer not null default 49, "cod_max_order_value" integer not null default 3000, "prepaid_discount_percent" real not null default 5, "cod_confirm_minutes" integer not null default 1440, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "payment_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_payment_settings_deleted_at" ON "payment_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cod_blocked_pincode" cascade;`);

    this.addSql(`drop table if exists "cod_confirmation" cascade;`);

    this.addSql(`drop table if exists "payment_settings" cascade;`);
  }

}
