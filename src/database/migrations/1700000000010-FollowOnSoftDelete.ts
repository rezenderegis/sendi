import { MigrationInterface, QueryRunner } from 'typeorm';

export class FollowOnSoftDelete1700000000010 implements MigrationInterface {
  name = 'FollowOnSoftDelete1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "follow_ons" ADD COLUMN "deletedAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP COLUMN "deletedAt"`);
  }
}
