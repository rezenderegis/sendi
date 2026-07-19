import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryPricing1700000000012 implements MigrationInterface {
  name = 'CategoryPricing1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "costPerFreeTextMessageCents" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "costPerMarketingMessageCents" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "costPerUtilityMessageCents" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ADD COLUMN "costPerAuthenticationMessageCents" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "costPerAuthenticationMessageCents"`);
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "costPerUtilityMessageCents"`);
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "costPerMarketingMessageCents"`);
    await queryRunner.query(`ALTER TABLE "platform_settings" DROP COLUMN "costPerFreeTextMessageCents"`);
  }
}
