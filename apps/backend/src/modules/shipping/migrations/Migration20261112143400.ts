import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261112143400 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "manual_pincode" drop constraint if exists "manual_pincode_pincode_unique";`);
    this.addSql(`create table if not exists "courier_settings" ("id" text not null, "default_courier" text not null default 'auto', "manual_courier_name" text null, "manual_tracking_url" text null, "manual_eta_min" integer not null default 3, "manual_eta_max" integer not null default 7, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "courier_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_courier_settings_deleted_at" ON "courier_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "manual_pincode" ("id" text not null, "pincode" text not null, "cod" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "manual_pincode_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_manual_pincode_pincode_unique" ON "manual_pincode" ("pincode") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_manual_pincode_deleted_at" ON "manual_pincode" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "courier_settings" cascade;`);

    this.addSql(`drop table if exists "manual_pincode" cascade;`);
  }

}
