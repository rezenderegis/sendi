import { MigrationInterface, QueryRunner } from 'typeorm';

export class FollowOnActivityType1700000000036 implements MigrationInterface {
  name = 'FollowOnActivityType1700000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "follow_ons" ADD COLUMN IF NOT EXISTS "activityTypeId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "follow_ons"
        ADD CONSTRAINT "FK_follow_ons_activity_type"
          FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_ons_activityTypeId" ON "follow_ons" ("activityTypeId")
    `);

    // Backfill: reunião -> "Reunião" da mesma empresa; qualquer outro tipo -> "Tarefa".
    await queryRunner.query(`
      UPDATE "follow_ons" f
      SET "activityTypeId" = at."id"
      FROM "activity_types" at
      WHERE at."companyId" = f."companyId"
        AND at."name" = CASE WHEN f."type" = 'meeting' THEN 'Reunião' ELSE 'Tarefa' END
        AND f."activityTypeId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP CONSTRAINT IF EXISTS "FK_follow_ons_activity_type"`);
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP COLUMN IF EXISTS "activityTypeId"`);
  }
}
