import { MigrationInterface, QueryRunner } from 'typeorm';

// Nomes têm que bater com DEFAULT_ACTIVITY_TYPE_NAMES em activity-type.entity.ts
const DEFAULT_NAMES = ['Tarefa', 'Reunião', 'Visita presencial', 'Reunião presencial'];

export class ActivityTypes1700000000035 implements MigrationInterface {
  name = 'ActivityTypes1700000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "activity_types"
        ADD CONSTRAINT "FK_activity_types_company"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_types_companyId" ON "activity_types" ("companyId")
    `);

    // Semeia os 4 tipos padrão pra toda empresa já existente.
    for (const name of DEFAULT_NAMES) {
      await queryRunner.query(
        `INSERT INTO "activity_types" ("companyId", "name") SELECT "id", $1 FROM "companies"`,
        [name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_types"`);
  }
}
