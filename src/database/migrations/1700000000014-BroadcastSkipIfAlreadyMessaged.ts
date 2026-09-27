import { MigrationInterface, QueryRunner } from 'typeorm';

export class BroadcastSkipIfAlreadyMessaged1700000000014 implements MigrationInterface {
  name = 'BroadcastSkipIfAlreadyMessaged1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "broadcasts" ADD COLUMN "skipIfAlreadyMessaged" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "broadcasts" ADD COLUMN "skippedCount" integer NOT NULL DEFAULT 0`);
    // Nome do enum segue a convenção padrão do TypeORM ({tabela}_{coluna}_enum). Confirme com
    // `\dT+ broadcast_recipients_status_enum` antes de rodar em produção — a tabela
    // broadcast_recipients foi criada via synchronize (sem migration própria).
    await queryRunner.query(`ALTER TYPE "public"."broadcast_recipients_status_enum" ADD VALUE IF NOT EXISTS 'skipped'`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_contact" ON "conversations" ("contactId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_number_direction" ON "messages" ("whatsappNumberId", "direction")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_number_direction"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_conversations_contact"`);
    // Postgres não suporta remover valor de enum — o valor 'skipped' permanece no tipo (inofensivo)
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN "skippedCount"`);
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN "skipIfAlreadyMessaged"`);
  }
}
