import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111081839 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "shipment" drop constraint if exists "shipment_awb_unique";`);
    this.addSql(`alter table if exists "shipment" drop constraint if exists "shipment_order_id_unique";`);
    this.addSql(`alter table if exists "order_event" drop constraint if exists "order_event_order_id_status_unique";`);
    this.addSql(`create table if not exists "order_event" ("id" text not null, "order_id" text not null, "status" text check ("status" in ('placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'rto', 'cancelled')) not null, "occurred_at" timestamptz not null, "source" text not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_event_deleted_at" ON "order_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_event_order_id_status_unique" ON "order_event" ("order_id", "status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "shipment" ("id" text not null, "order_id" text not null, "fulfillment_id" text null, "courier" text not null, "courier_name" text null, "external_id" text null, "awb" text not null, "label_url" text null, "tracking_url" text null, "weight_g" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipment_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shipment_order_id_unique" ON "shipment" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_shipment_awb_unique" ON "shipment" ("awb") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_shipment_deleted_at" ON "shipment" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_event" cascade;`);

    this.addSql(`drop table if exists "shipment" cascade;`);
  }

}
