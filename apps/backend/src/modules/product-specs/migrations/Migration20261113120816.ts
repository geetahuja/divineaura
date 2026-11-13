import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113120816 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_specs" add column if not exists "net_quantity" text null, add column if not exists "packed_on" text null, add column if not exists "liquid_fragile" boolean null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_specs" drop column if exists "net_quantity", drop column if exists "packed_on", drop column if exists "liquid_fragile";`);
  }

}
