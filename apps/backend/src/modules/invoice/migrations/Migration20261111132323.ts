import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111132323 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_number_unique";`);
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_order_id_unique";`);
    this.addSql(`alter table if exists "doc_counter" drop constraint if exists "doc_counter_kind_fy_unique";`);
    this.addSql(`alter table if exists "credit_note" drop constraint if exists "credit_note_source_key_unique";`);
    this.addSql(`alter table if exists "credit_note" drop constraint if exists "credit_note_number_unique";`);
    this.addSql(`create table if not exists "business_settings" ("id" text not null, "legal_name" text not null default 'Jayshankar Enterprises', "brand_name" text not null default 'DivineAura', "address" text not null default '', "state" text not null default 'Maharashtra', "gstin" text null, "email" text null, "phone" text null, "invoice_prefix" text not null default 'DA', "credit_note_prefix" text not null default 'CN', "return_window_days" integer not null default 7, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "business_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_business_settings_deleted_at" ON "business_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "credit_note" ("id" text not null, "number" text not null, "invoice_number" text not null, "order_id" text not null, "source_key" text not null, "amount" numeric not null, "issued_at" timestamptz not null, "data" jsonb not null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "credit_note_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_credit_note_number_unique" ON "credit_note" ("number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_note_order_id" ON "credit_note" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_credit_note_source_key_unique" ON "credit_note" ("source_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_note_deleted_at" ON "credit_note" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "doc_counter" ("id" text not null, "kind" text check ("kind" in ('invoice', 'credit_note')) not null, "fy" text not null, "last" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "doc_counter_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_doc_counter_deleted_at" ON "doc_counter" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_doc_counter_kind_fy_unique" ON "doc_counter" ("kind", "fy") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "invoice" ("id" text not null, "order_id" text not null, "number" text not null, "issued_at" timestamptz not null, "data" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_order_id_unique" ON "invoice" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoice_number_unique" ON "invoice" ("number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "business_settings" cascade;`);

    this.addSql(`drop table if exists "credit_note" cascade;`);

    this.addSql(`drop table if exists "doc_counter" cascade;`);

    this.addSql(`drop table if exists "invoice" cascade;`);
  }

}
