import { MigrationInterface, QueryRunner } from 'typeorm';

export class FollowOnTitle1700000000026 implements MigrationInterface {
  name = 'FollowOnTitle1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follow_ons" ADD COLUMN IF NOT EXISTS "title" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP COLUMN IF EXISTS "title"`);
  }
}
