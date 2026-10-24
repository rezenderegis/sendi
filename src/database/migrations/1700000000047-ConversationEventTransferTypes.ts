import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationEventTransferTypes1700000000047 implements MigrationInterface {
  name = 'ConversationEventTransferTypes1700000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mesma ressalva de 1700000000016/1700000000020: conversation_events foi criada
    // via synchronize, sem migration própria — confirme `\dT+ conversation_events_type_enum`
    // antes de rodar em produção.
    await queryRunner.query(`ALTER TYPE "public"."conversation_events_type_enum" ADD VALUE IF NOT EXISTS 'transferred_to_department'`);
    await queryRunner.query(`ALTER TYPE "public"."conversation_events_type_enum" ADD VALUE IF NOT EXISTS 'transferred_to_user'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres não suporta remover valor de enum — os valores permanecem no tipo (inofensivo)
  }
}
