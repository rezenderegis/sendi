import { MigrationInterface, QueryRunner } from 'typeorm';

export class Teams1700000000029 implements MigrationInterface {
  name = 'Teams1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "leaderId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "teams"
        ADD CONSTRAINT "FK_teams_leader"
          FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_teams_companyId" ON "teams" ("companyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
  }
}
