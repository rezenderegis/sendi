import { MigrationInterface, QueryRunner } from 'typeorm';

export class Professionals1700000000050 implements MigrationInterface {
  name = 'Professionals1700000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "professionals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "specialty" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_professionals" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "professionals"
        ADD CONSTRAINT "FK_professionals_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_professionals_companyId" ON "professionals" ("companyId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "professional_services" (
        "professionalId" uuid NOT NULL,
        "serviceId" uuid NOT NULL,
        CONSTRAINT "PK_professional_services" PRIMARY KEY ("professionalId", "serviceId"),
        CONSTRAINT "FK_professional_services_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_professional_services_service" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_professional_services_serviceId" ON "professional_services" ("serviceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "professional_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "professionals"`);
  }
}
