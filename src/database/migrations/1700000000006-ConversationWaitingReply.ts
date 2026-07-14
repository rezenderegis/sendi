import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationWaitingReply1700000000006 implements MigrationInterface {
  name = 'ConversationWaitingReply1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "waitingReply" boolean NOT NULL DEFAULT false`,
    );

    // Marca como aguardando resposta conversas abertas onde o último evento
    // foi inbound (lastInboundAt == lastMessageAt dentro de 10 segundos)
    await queryRunner.query(`
      UPDATE "conversations"
      SET "waitingReply" = true
      WHERE status = 'open'
        AND "lastInboundAt" IS NOT NULL
        AND ABS(EXTRACT(EPOCH FROM ("lastMessageAt" - "lastInboundAt"))) < 10
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "waitingReply"`,
    );
  }
}
