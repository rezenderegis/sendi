import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactKanbanEvents1700000000028 implements MigrationInterface {
  name = 'ContactKanbanEvents1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."contact_kanban_events_action_enum" AS ENUM('moved', 'lost', 'reopened')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact_kanban_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "contactId" uuid NOT NULL,
        "fromColumnId" uuid,
        "toColumnId" uuid,
        "action" "public"."contact_kanban_events_action_enum" NOT NULL,
        "reason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact_kanban_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contact_kanban_events_company_created"
        ON "contact_kanban_events" ("companyId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contact_kanban_events_contact"
        ON "contact_kanban_events" ("contactId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_kanban_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contact_kanban_events_action_enum"`);
  }
}
