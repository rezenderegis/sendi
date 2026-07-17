import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKanbanColumns1700000000008 implements MigrationInterface {
  name = 'CreateKanbanColumns1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "kanban_columns" (
        "id"        uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid              NOT NULL,
        "name"      character varying NOT NULL,
        "color"     character varying NOT NULL DEFAULT '#6B7280',
        "position"  integer           NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP         NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kanban_columns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_kanban_columns_company"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD COLUMN IF NOT EXISTS "kanbanColumnId" uuid,
        ADD CONSTRAINT "FK_conversations_kanban_column"
          FOREIGN KEY ("kanbanColumnId") REFERENCES "kanban_columns"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_kanban_column"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "kanbanColumnId"`);
    await queryRunner.query(`DROP TABLE "kanban_columns"`);
  }
}
