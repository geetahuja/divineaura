import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111081838 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "payment_settings" add column if not exists "cod_fee_tax_mode" text check ("cod_fee_tax_mode" in ('goods', 'fixed')) not null default 'goods', add column if not exists "cod_fee_tax_rate" real not null default 18;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "payment_settings" drop column if exists "cod_fee_tax_mode", drop column if exists "cod_fee_tax_rate";`);
  }

}
