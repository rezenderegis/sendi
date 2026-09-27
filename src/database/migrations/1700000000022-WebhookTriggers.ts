import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebhookTriggers1700000000022 implements MigrationInterface {
  name = 'WebhookTriggers1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "triggerWebhookSecret" text`);

    await queryRunner.query(`CREATE TYPE "webhook_trigger_events_status_enum" AS ENUM ('success', 'error')`);
    await queryRunner.query(`
      CREATE TABLE "webhook_trigger_events" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "whatsappNumberId" uuid NOT NULL,
        "companyId"      uuid NOT NULL,
        "phone"          character varying NOT NULL,
        "promptName"     character varying,
        "flowName"       character varying,
        "idempotencyKey" character varying,
        "status"         "webhook_trigger_events_status_enum" NOT NULL,
        "errorMessage"   text,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_trigger_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_webhook_trigger_events_idempotency"
      ON "webhook_trigger_events" ("whatsappNumberId", "idempotencyKey")
      WHERE "idempotencyKey" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webhook_trigger_events"`);
    await queryRunner.query(`DROP TYPE "webhook_trigger_events_status_enum"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "triggerWebhookSecret"`);
  }
}
