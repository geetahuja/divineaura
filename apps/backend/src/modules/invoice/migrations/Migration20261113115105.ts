import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261113115105 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "business_settings" add column if not exists "brand_name_hi" text not null default 'अनंत सनातन', add column if not exists "tagline_en" text not null default 'Beyond Eternity, Beyond Time.', add column if not exists "tagline_hi" text not null default 'समय से पहले, समय के बाद भी।', add column if not exists "social_instagram" text null, add column if not exists "social_facebook" text null, add column if not exists "social_youtube" text null, add column if not exists "social_pinterest" text null, add column if not exists "next_snan_label" text null, add column if not exists "next_snan_date" text null, add column if not exists "goda_jal_dispatch_date" text null, add column if not exists "goda_jal_packer" text null;`);
    this.addSql(`alter table if exists "business_settings" alter column "brand_name" type text using ("brand_name"::text);`);
    this.addSql(`alter table if exists "business_settings" alter column "brand_name" set default 'Anant Sanatan';`);
    this.addSql(`alter table if exists "business_settings" alter column "invoice_prefix" type text using ("invoice_prefix"::text);`);
    this.addSql(`alter table if exists "business_settings" alter column "invoice_prefix" set default 'AS';`);
    // Rebrand DivineAura → Anant Sanatan (only rows still on the old defaults).
    this.addSql(`update "business_settings" set "brand_name" = 'Anant Sanatan' where "brand_name" in ('DivineAura', 'Divine Aura');`);
    this.addSql(`update "business_settings" set "invoice_prefix" = 'AS' where "invoice_prefix" = 'DA';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "business_settings" drop column if exists "brand_name_hi", drop column if exists "tagline_en", drop column if exists "tagline_hi", drop column if exists "social_instagram", drop column if exists "social_facebook", drop column if exists "social_youtube", drop column if exists "social_pinterest", drop column if exists "next_snan_label", drop column if exists "next_snan_date", drop column if exists "goda_jal_dispatch_date", drop column if exists "goda_jal_packer";`);

    this.addSql(`alter table if exists "business_settings" alter column "brand_name" type text using ("brand_name"::text);`);
    this.addSql(`alter table if exists "business_settings" alter column "brand_name" set default 'DivineAura';`);
    this.addSql(`alter table if exists "business_settings" alter column "invoice_prefix" type text using ("invoice_prefix"::text);`);
    this.addSql(`alter table if exists "business_settings" alter column "invoice_prefix" set default 'DA';`);
  }

}
