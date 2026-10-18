import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserTeamId1700000000030 implements MigrationInterface {
  name = 'UserTeamId1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teamId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_team"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_teamId" ON "users" ("teamId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_team"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "teamId"`);
  }
}
