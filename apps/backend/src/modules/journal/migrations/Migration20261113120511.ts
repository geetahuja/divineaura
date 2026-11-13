import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113120511 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "journal_article" drop constraint if exists "journal_article_slug_unique";`);
    this.addSql(`create table if not exists "journal_article" ("id" text not null, "title" text not null, "slug" text not null, "excerpt" text null, "body" text not null, "cover_image_url" text null, "cover_image_alt" text null, "published" boolean not null default false, "published_at" timestamptz null, "seo_title" text null, "seo_description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "journal_article_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_journal_article_slug_unique" ON "journal_article" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_journal_article_deleted_at" ON "journal_article" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "journal_article" cascade;`);
  }

}
