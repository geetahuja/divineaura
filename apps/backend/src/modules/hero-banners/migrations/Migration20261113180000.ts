import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113180000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hero_banner" add column if not exists "caption" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "hero_banner" drop column if exists "caption";`);
  }

}
