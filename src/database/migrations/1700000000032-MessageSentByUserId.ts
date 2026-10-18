import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessageSentByUserId1700000000032 implements MigrationInterface {
  name = 'MessageSentByUserId1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sentByUserId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD CONSTRAINT "FK_messages_sent_by_user"
          FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    // Índice composto: query de progresso das metas filtra por usuário + janela de data.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_sentByUserId_sentAt" ON "messages" ("sentByUserId", "sentAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_sent_by_user"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "sentByUserId"`);
  }
}
