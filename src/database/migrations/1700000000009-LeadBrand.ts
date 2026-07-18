import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadBrand1700000000009 implements MigrationInterface {
  name = 'LeadBrand1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "lead_brand_enum" AS ENUM ('sende', 'globalsix')
    `);
    await queryRunner.query(`
      ALTER TABLE "leads" ADD COLUMN "brand" "lead_brand_enum" NOT NULL DEFAULT 'sende'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN "brand"`);
    await queryRunner.query(`DROP TYPE "lead_brand_enum"`);
  }
}
