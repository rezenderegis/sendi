import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationEventExternalAction1700000000016 implements MigrationInterface {
  name = 'ConversationEventExternalAction1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nome do enum segue a convenção padrão do TypeORM ({tabela}_{coluna}_enum). Confirme com
    // `\dT+ conversation_events_type_enum` antes de rodar em produção — a tabela
    // conversation_events foi criada via synchronize (sem migration própria), mesma ressalva
    // já documentada em 1700000000014-BroadcastSkipIfAlreadyMessaged.ts.
    await queryRunner.query(`ALTER TYPE "public"."conversation_events_type_enum" ADD VALUE IF NOT EXISTS 'external_action_called'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres não suporta remover valor de enum — o valor 'external_action_called' permanece no tipo (inofensivo)
  }
}
