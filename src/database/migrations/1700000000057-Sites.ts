import { MigrationInterface, QueryRunner } from 'typeorm';

export class Sites1700000000057 implements MigrationInterface {
  name = 'Sites1700000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "domain" character varying,
        "content" text NOT NULL DEFAULT '',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sites_slug" UNIQUE ("slug"),
        CONSTRAINT "UQ_sites_domain" UNIQUE ("domain")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sites"
        ADD CONSTRAINT "FK_sites_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sites_companyId" ON "sites" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sites"`);
  }
}
