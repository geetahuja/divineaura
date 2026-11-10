import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261110130532 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "sacred_place" ("id" text not null, "name" text not null, "location" text not null, "description" text not null, "image_url" text null, "image_credit" text null, "deity_tag" text null, "collection_id" text null, "rank" integer not null default 0, "visible" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "sacred_place_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_sacred_place_deleted_at" ON "sacred_place" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "sacred_place" cascade;`);
  }

}
