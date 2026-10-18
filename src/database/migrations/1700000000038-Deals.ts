import { MigrationInterface, QueryRunner } from 'typeorm';

export class Deals1700000000038 implements MigrationInterface {
  name = 'Deals1700000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "contactId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "kanbanColumnId" uuid,
        "kanbanColumnChangedAt" timestamptz,
        "dealValue" decimal(12,2),
        "dealOwnerId" uuid,
        "lostAt" timestamptz,
        "lostReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deals" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "deals"
        ADD CONSTRAINT "FK_deals_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id"),
        ADD CONSTRAINT "FK_deals_contact" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_deals_kanban_column" FOREIGN KEY ("kanbanColumnId") REFERENCES "kanban_columns"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_deals_deal_owner" FOREIGN KEY ("dealOwnerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_deals_companyId" ON "deals" ("companyId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_deals_contactId" ON "deals" ("contactId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "deals"`);
  }
}
