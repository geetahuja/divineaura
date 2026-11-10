import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261110130531 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_specs" ("id" text not null, "material" text null, "stone_type" text null, "stone_origin" text check ("stone_origin" in ('natural', 'reconstituted', 'dyed', 'not_applicable')) null, "bead_size_mm" real null, "bead_count" integer null, "length_cm" real null, "dimensions_mm" text null, "weight_g" real null, "chain_included" boolean null, "colour" text null, "pack_quantity" integer null, "care_instructions" text null, "mantra" text null, "certificate_url" text null, "country_of_origin" text null, "hsn_code" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_specs_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_specs_deleted_at" ON "product_specs" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_specs" cascade;`);
  }

}
