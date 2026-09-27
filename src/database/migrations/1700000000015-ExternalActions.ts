import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExternalActions1700000000015 implements MigrationInterface {
  name = 'ExternalActions1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."external_actions_method_enum" AS ENUM('GET', 'POST', 'PUT')
    `);

    await queryRunner.query(`
      CREATE TABLE "external_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "method" "public"."external_actions_method_enum" NOT NULL DEFAULT 'POST',
        "url" character varying NOT NULL,
        "headersTemplate" jsonb,
        "bodyTemplate" jsonb,
        "parametersSchema" jsonb NOT NULL,
        "accessToken" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "timeoutMs" integer NOT NULL DEFAULT 8000,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_external_actions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_external_actions_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_external_actions_company" ON "external_actions" ("companyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_external_actions_company"`);
    await queryRunner.query(`DROP TABLE "external_actions"`);
    await queryRunner.query(`DROP TYPE "public"."external_actions_method_enum"`);
  }
}
