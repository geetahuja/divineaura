import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111161137 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_slug_unique";`);
    this.addSql(`create table if not exists "content_page" ("id" text not null, "slug" text not null, "title" text not null, "body" text not null default '', "faq" jsonb null, "seo_title" text null, "seo_description" text null, "published" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_slug_unique" ON "content_page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "privacy_request" ("id" text not null, "kind" text check ("kind" in ('delete_data', 'access_data', 'correct_data')) not null default 'delete_data', "name" text not null, "email" text null, "phone" text null, "details" text null, "status" text check ("status" in ('open', 'done', 'rejected')) not null default 'open', "admin_note" text null, "ip" text null, "closed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "privacy_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_privacy_request_deleted_at" ON "privacy_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_privacy_request_status" ON "privacy_request" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_page" cascade;`);

    this.addSql(`drop table if exists "privacy_request" cascade;`);
  }

}
