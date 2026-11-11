import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111152205 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "review_request" drop constraint if exists "review_request_order_id_unique";`);
    this.addSql(`alter table if exists "review" drop constraint if exists "review_order_item_id_unique";`);
    this.addSql(`create table if not exists "review" ("id" text not null, "product_id" text not null, "order_id" text not null, "order_number" integer not null, "order_item_id" text not null, "customer_id" text not null, "rating" integer not null, "title" text null, "body" text not null, "photos" jsonb not null, "display_name" text not null, "status" text check ("status" in ('pending', 'approved', 'rejected', 'hidden')) not null default 'pending', "reject_reason" text null, "reply" text null, "replied_at" timestamptz null, "approved_at" timestamptz null, "incentive_code" text null, "ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_order_item_id_unique" ON "review" ("order_item_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_product_id_status" ON "review" ("product_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_customer_id" ON "review" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_order_id" ON "review" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_status" ON "review" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review_request" ("id" text not null, "order_id" text not null, "sent_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_review_request_order_id_unique" ON "review_request" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_request_deleted_at" ON "review_request" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review_settings" ("id" text not null, "request_after_days" integer not null default 5, "min_body_length" integer not null default 20, "blocked_words" text not null default '', "incentive_enabled" boolean not null default false, "incentive_percent" integer not null default 10, "incentive_requires_photo" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_settings_deleted_at" ON "review_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "review" cascade;`);

    this.addSql(`drop table if exists "review_request" cascade;`);

    this.addSql(`drop table if exists "review_settings" cascade;`);
  }

}
