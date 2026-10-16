import { MigrationInterface, QueryRunner } from 'typeorm';

export class KanbanOnContactFollowOnOnContact1700000000024 implements MigrationInterface {
  name = 'KanbanOnContactFollowOnOnContact1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kanban passa a ser do Contact (lead), não da Conversation —
    // assim dá pra colocar alguém no quadro antes de iniciar conversa.
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "kanbanColumnId" uuid,
        ADD CONSTRAINT "FK_contacts_kanban_column"
          FOREIGN KEY ("kanbanColumnId") REFERENCES "kanban_columns"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_kanban_column"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "kanbanColumnId"`);

    // Follow-on passa a ser do Contact (histórico por pessoa, não por conversa).
    // whatsappNumberId fica explícito pro tipo "message" (envio automático),
    // já que sem uma conversation não há número associado por padrão.
    await queryRunner.query(`
      ALTER TABLE "follow_ons"
        ADD COLUMN IF NOT EXISTS "contactId" uuid,
        ADD COLUMN IF NOT EXISTS "whatsappNumberId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "follow_ons"
        ADD CONSTRAINT "FK_follow_ons_whatsapp_number"
          FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP COLUMN IF EXISTS "conversationId"`);
    await queryRunner.query(`ALTER TABLE "follow_ons" ALTER COLUMN "contactId" SET NOT NULL`);

    // Notificação de follow-on também passa a poder referenciar o contato
    // diretamente (pra funcionar sem conversa associada).
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "contactId" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "contactId"`);

    await queryRunner.query(`ALTER TABLE "follow_ons" ADD COLUMN IF NOT EXISTS "conversationId" uuid`);
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP CONSTRAINT IF EXISTS "FK_follow_ons_whatsapp_number"`);
    await queryRunner.query(`
      ALTER TABLE "follow_ons"
        DROP COLUMN IF EXISTS "whatsappNumberId",
        DROP COLUMN IF EXISTS "contactId"
    `);

    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD COLUMN IF NOT EXISTS "kanbanColumnId" uuid,
        ADD CONSTRAINT "FK_conversations_kanban_column"
          FOREIGN KEY ("kanbanColumnId") REFERENCES "kanban_columns"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_kanban_column"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "kanbanColumnId"`);
  }
}
