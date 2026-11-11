import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111161138 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "business_settings" add column if not exists "grievance_name" text null, add column if not exists "grievance_email" text null, add column if not exists "grievance_phone" text null, add column if not exists "grievance_ack_hours" integer not null default 48, add column if not exists "grievance_resolve_days" integer not null default 30;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "business_settings" drop column if exists "grievance_name", drop column if exists "grievance_email", drop column if exists "grievance_phone", drop column if exists "grievance_ack_hours", drop column if exists "grievance_resolve_days";`);
  }

}
