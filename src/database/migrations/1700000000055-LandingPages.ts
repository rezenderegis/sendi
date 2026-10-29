import { MigrationInterface, QueryRunner } from 'typeorm';

export class LandingPages1700000000055 implements MigrationInterface {
  name = 'LandingPages1700000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "landing_pages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_landing_pages" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_landing_pages_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "landing_pages" ("slug", "name") VALUES
        ('sende', 'Send'),
        ('globalsix', 'Global Six'),
        ('sf-pintura', 'SF Funilaria e Pintura')
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "landing_pages"`);
  }
}
