import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111122946 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_email_unique";`);
    this.addSql(`alter table if exists "message_log" drop constraint if exists "message_log_dedupe_key_channel_unique";`);
    this.addSql(`create table if not exists "message_log" ("id" text not null, "event" text not null, "channel" text not null, "recipient" text not null, "status" text check ("status" in ('sending', 'sent', 'failed', 'skipped')) not null default 'sending', "provider" text null, "provider_message_id" text null, "error" text null, "order_id" text null, "order_number" integer null, "dedupe_key" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "message_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_log_deleted_at" ON "message_log" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_message_log_dedupe_key_channel_unique" ON "message_log" ("dedupe_key", "channel") WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_log_order_id" ON "message_log" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_log_recipient" ON "message_log" ("recipient") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "newsletter_subscriber" ("id" text not null, "email" text not null, "consent_text" text not null, "consented_at" timestamptz not null, "unsubscribed_at" timestamptz null, "source" text not null default 'footer', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "newsletter_subscriber_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_email_unique" ON "newsletter_subscriber" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_deleted_at" ON "newsletter_subscriber" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "message_log" cascade;`);

    this.addSql(`drop table if exists "newsletter_subscriber" cascade;`);
  }

}
