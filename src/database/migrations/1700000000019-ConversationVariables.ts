import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationVariables1700000000019 implements MigrationInterface {
  name = 'ConversationVariables1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN "variables" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "variables"`);
  }
}
