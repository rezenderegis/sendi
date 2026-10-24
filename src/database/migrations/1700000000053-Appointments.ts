import { MigrationInterface, QueryRunner } from 'typeorm';

export class Appointments1700000000053 implements MigrationInterface {
  name = 'Appointments1700000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."appointments_status_enum" AS ENUM('scheduled', 'cancelled', 'completed', 'no_show')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "contactId" uuid NOT NULL,
        "professionalId" uuid,
        "serviceId" uuid,
        "scheduledAt" timestamptz NOT NULL,
        "durationMinutes" integer NOT NULL,
        "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'scheduled',
        "notes" character varying,
        "reminderSentAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD CONSTRAINT "FK_appointments_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id"),
        ADD CONSTRAINT "FK_appointments_contact" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_appointments_professional" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_appointments_service" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_professional_scheduledAt" ON "appointments" ("professionalId", "scheduledAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId" ON "appointments" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."appointments_status_enum"`);
  }
}
