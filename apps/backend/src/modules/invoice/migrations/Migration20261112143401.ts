import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261112143401 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "doc_counter" drop constraint if exists "doc_counter_kind_check";`);

    this.addSql(`alter table if exists "business_settings" add column if not exists "gst_scheme" text check ("gst_scheme" in ('regular', 'composition')) not null default 'regular', add column if not exists "bill_of_supply_prefix" text not null default 'BOS';`);

    this.addSql(`alter table if exists "doc_counter" add constraint "doc_counter_kind_check" check("kind" in ('invoice', 'credit_note', 'bill_of_supply'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "doc_counter" drop constraint if exists "doc_counter_kind_check";`);

    this.addSql(`alter table if exists "business_settings" drop column if exists "gst_scheme", drop column if exists "bill_of_supply_prefix";`);

    this.addSql(`alter table if exists "doc_counter" add constraint "doc_counter_kind_check" check("kind" in ('invoice', 'credit_note'));`);
  }

}
