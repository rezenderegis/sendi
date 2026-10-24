import { MigrationInterface, QueryRunner } from 'typeorm';

export class Services1700000000049 implements MigrationInterface {
  name = 'Services1700000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "durationMinutes" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_services" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "services"
        ADD CONSTRAINT "FK_services_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_services_companyId" ON "services" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
  }
}
