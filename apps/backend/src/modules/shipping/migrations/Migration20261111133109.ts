import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111133109 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "order_event" drop constraint if exists "order_event_status_check";`);

    this.addSql(`alter table if exists "order_event" add constraint "order_event_status_check" check("status" in ('placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'rto', 'cancelled', 'return_requested', 'returned', 'refunded'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_event" drop constraint if exists "order_event_status_check";`);

    this.addSql(`alter table if exists "order_event" add constraint "order_event_status_check" check("status" in ('placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'rto', 'cancelled'));`);
  }

}
