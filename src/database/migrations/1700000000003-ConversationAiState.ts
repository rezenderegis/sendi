import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationAiState1700000000003 implements MigrationInterface {
  name = 'ConversationAiState1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "aiState" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN IF EXISTS "aiState"`,
    );
  }
}
