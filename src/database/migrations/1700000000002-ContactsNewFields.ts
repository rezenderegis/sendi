import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactsNewFields1700000000002 implements MigrationInterface {
  name = 'ContactsNewFields1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappName" character varying`);
    await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "companyName" character varying`);
    await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "notes" text`);
    await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "externalId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "externalId"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "companyName"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "avatarUrl"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "whatsappName"`);
  }
}
