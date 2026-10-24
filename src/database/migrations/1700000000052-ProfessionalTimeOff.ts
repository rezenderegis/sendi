import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfessionalTimeOff1700000000052 implements MigrationInterface {
  name = 'ProfessionalTimeOff1700000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "professional_time_off" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "professionalId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "date" date NOT NULL,
        "startTime" time,
        "endTime" time,
        "reason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_professional_time_off" PRIMARY KEY ("id"),
        CONSTRAINT "FK_professional_time_off_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_professional_time_off_professionalId_date" ON "professional_time_off" ("professionalId", "date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "professional_time_off"`);
  }
}
