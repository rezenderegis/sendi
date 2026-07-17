import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTokenVersion1700000000005 implements MigrationInterface {
  name = 'UserTokenVersion1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion"`);
  }
}
