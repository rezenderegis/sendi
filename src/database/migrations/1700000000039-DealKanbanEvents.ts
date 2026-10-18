import { MigrationInterface, QueryRunner } from 'typeorm';

export class DealKanbanEvents1700000000039 implements MigrationInterface {
  name = 'DealKanbanEvents1700000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."deal_kanban_events_action_enum" AS ENUM('moved', 'lost', 'reopened')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deal_kanban_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "dealId" uuid NOT NULL,
        "fromColumnId" uuid,
        "toColumnId" uuid,
        "action" "public"."deal_kanban_events_action_enum" NOT NULL,
        "reason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deal_kanban_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deal_kanban_events_company_created"
        ON "deal_kanban_events" ("companyId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deal_kanban_events_deal"
        ON "deal_kanban_events" ("dealId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "deal_kanban_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."deal_kanban_events_action_enum"`);
  }
}
