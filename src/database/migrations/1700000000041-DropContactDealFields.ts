import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropContactDealFields1700000000041 implements MigrationInterface {
  name = 'DropContactDealFields1700000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_kanban_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contact_kanban_events_action_enum"`);

    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_kanban_column"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_deal_owner"`);
    await queryRunner.query(`
      ALTER TABLE "contacts"
        DROP COLUMN IF EXISTS "kanbanColumnId",
        DROP COLUMN IF EXISTS "kanbanColumnChangedAt",
        DROP COLUMN IF EXISTS "dealValue",
        DROP COLUMN IF EXISTS "dealOwnerId",
        DROP COLUMN IF EXISTS "lostAt",
        DROP COLUMN IF EXISTS "lostReason"
    `);
  }

  // Down só recria a estrutura (colunas/tabela vazias) — não tenta reconstituir
  // o dado, já migrado irreversivelmente pra "deals" na migration anterior.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "kanbanColumnId" uuid,
        ADD COLUMN IF NOT EXISTS "kanbanColumnChangedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "dealValue" decimal(12,2),
        ADD COLUMN IF NOT EXISTS "dealOwnerId" uuid,
        ADD COLUMN IF NOT EXISTS "lostAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "lostReason" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD CONSTRAINT "FK_contacts_kanban_column"
          FOREIGN KEY ("kanbanColumnId") REFERENCES "kanban_columns"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_contacts_deal_owner"
          FOREIGN KEY ("dealOwnerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

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
  }
}
