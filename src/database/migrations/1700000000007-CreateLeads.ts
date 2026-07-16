import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeads1700000000007 implements MigrationInterface {
  name = 'CreateLeads1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "lead_source_enum" AS ENUM ('form', 'whatsapp')
    `);
    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "name"      character varying NOT NULL,
        "email"     character varying NOT NULL,
        "phone"     character varying NOT NULL,
        "source"    "lead_source_enum" NOT NULL DEFAULT 'form',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leads" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "leads"`);
    await queryRunner.query(`DROP TYPE "lead_source_enum"`);
  }
}
