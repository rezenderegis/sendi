import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsageAndBilling1700000000011 implements MigrationInterface {
  name = 'UsageAndBilling1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN "balanceCents" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "dailySpendLimitCents" integer`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "monthlySpendLimitCents" integer`);

    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "whatsappNumberId" uuid`);
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "costCents" integer NOT NULL DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "isPlatformAdmin" boolean NOT NULL DEFAULT false`);

    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "id"                          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "costPerOutboundMessageCents" integer NOT NULL DEFAULT 0,
        "costPerBotMessageCents"      integer NOT NULL DEFAULT 0,
        "updatedAt"                   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE TYPE "balance_transaction_type_enum" AS ENUM ('credit', 'adjustment')`);
    await queryRunner.query(`
      CREATE TABLE "balance_transactions" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId"       uuid NOT NULL,
        "amountCents"     integer NOT NULL,
        "type"            "balance_transaction_type_enum" NOT NULL DEFAULT 'credit',
        "reason"          text,
        "createdByUserId" uuid,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_balance_transactions" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "balance_transactions"`);
    await queryRunner.query(`DROP TYPE "balance_transaction_type_enum"`);
    await queryRunner.query(`DROP TABLE "platform_settings"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isPlatformAdmin"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "costCents"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "whatsappNumberId"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "monthlySpendLimitCents"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "dailySpendLimitCents"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "balanceCents"`);
  }
}
