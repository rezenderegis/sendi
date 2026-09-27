import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpendGuardrails1700000000023 implements MigrationInterface {
  name = 'SpendGuardrails1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "defaultDailySpendLimitCents" integer`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "defaultMonthlySpendLimitCents" integer`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "lastSpendLimitAlertAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "lastSpendLimitAlertAt"`);
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "defaultMonthlySpendLimitCents"`);
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "defaultDailySpendLimitCents"`);
  }
}
