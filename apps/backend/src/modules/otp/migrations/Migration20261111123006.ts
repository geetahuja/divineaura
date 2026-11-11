import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261111123006 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "otp_challenge" ("id" text not null, "identifier" text not null, "code_hash" text not null, "expires_at" timestamptz not null, "attempts" integer not null default 0, "sends" integer not null default 1, "last_sent_at" timestamptz not null, "consumed_at" timestamptz null, "ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "otp_challenge_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_otp_challenge_deleted_at" ON "otp_challenge" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_otp_challenge_identifier" ON "otp_challenge" ("identifier") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_otp_challenge_ip" ON "otp_challenge" ("ip") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "otp_challenge" cascade;`);
  }

}
