import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261110154736 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "hero_banner" ("id" text not null, "title" text not null, "heading" text not null, "subheading" text null, "button_text" text not null, "button_link" text not null, "image_desktop_url" text null, "image_mobile_url" text null, "image_alt" text null, "starts_at" timestamptz null, "ends_at" timestamptz null, "priority" integer not null default 0, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hero_banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hero_banner_deleted_at" ON "hero_banner" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_banner" cascade;`);
  }

}
