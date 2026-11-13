import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113115746 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "sacred_place" add column if not exists "strip_label" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "sacred_place" drop column if exists "strip_label";`);
  }

}
