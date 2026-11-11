import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111132322 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_specs" add column if not exists "not_returnable" boolean null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_specs" drop column if exists "not_returnable";`);
  }

}
