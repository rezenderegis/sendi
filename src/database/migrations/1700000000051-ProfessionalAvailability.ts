import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessionalAvailability1700000000051 implements MigrationInterface {
  name = 'ProfessionalAvailability1700000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "professional_availability" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "professionalId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "weekday" integer NOT NULL,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        CONSTRAINT "PK_professional_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_professional_availability_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_professional_availability_professionalId" ON "professional_availability" ("professionalId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "professional_availability"`);
  }
}
