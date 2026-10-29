import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyModules1700000000056 implements MigrationInterface {
  name = 'CompanyModules1700000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN IF NOT EXISTS "enabledModules" jsonb NOT NULL DEFAULT '["crm"]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "enabledModules"`);
  }
}
