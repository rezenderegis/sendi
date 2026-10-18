import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillDeals1700000000040 implements MigrationInterface {
  name = 'BackfillDeals1700000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Um deal por contato que já tinha raia ou estava perdido — nesse momento
    // é sempre 1:1, então o título é só o nome do contato (sem "Negócio N").
    await queryRunner.query(`
      INSERT INTO "deals" ("companyId", "contactId", "title", "kanbanColumnId", "kanbanColumnChangedAt", "dealValue", "dealOwnerId", "lostAt", "lostReason")
      SELECT "companyId", "id", "name", "kanbanColumnId", "kanbanColumnChangedAt", "dealValue", "dealOwnerId", "lostAt", "lostReason"
      FROM "contacts"
      WHERE "kanbanColumnId" IS NOT NULL OR "lostAt" IS NOT NULL
    `);

    // Histórico de movimentação — casado pelo contactId, que ainda é 1:1 aqui.
    await queryRunner.query(`
      INSERT INTO "deal_kanban_events" ("companyId", "dealId", "fromColumnId", "toColumnId", "action", "reason", "createdAt")
      SELECT e."companyId", d."id", e."fromColumnId", e."toColumnId",
             e."action"::text::"public"."deal_kanban_events_action_enum", e."reason", e."createdAt"
      FROM "contact_kanban_events" e
      JOIN "deals" d ON d."contactId" = e."contactId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "deal_kanban_events"`);
    await queryRunner.query(`DELETE FROM "deals"`);
  }
}
