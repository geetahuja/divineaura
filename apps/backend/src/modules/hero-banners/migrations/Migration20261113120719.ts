import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113120719 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hero_banner" add column if not exists "subheading_hi" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "hero_banner" drop column if exists "subheading_hi";`);
  }

}
