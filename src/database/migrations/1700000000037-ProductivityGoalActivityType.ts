import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductivityGoalActivityType1700000000037 implements MigrationInterface {
  name = 'ProductivityGoalActivityType1700000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres >= 12 permite usar o novo valor do enum na mesma transação.
    await queryRunner.query(`
      ALTER TYPE "public"."productivity_goals_metric_enum" ADD VALUE IF NOT EXISTS 'activity'
    `);

    await queryRunner.query(`
      ALTER TABLE "productivity_goals" ADD COLUMN IF NOT EXISTS "activityTypeId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "productivity_goals"
        ADD CONSTRAINT "FK_productivity_goals_activity_type"
          FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT
    `);

    // Backfill: tasks_completed -> "Tarefa" da mesma empresa; meetings_held -> "Reunião".
    await queryRunner.query(`
      UPDATE "productivity_goals" pg
      SET "activityTypeId" = at."id", metric = 'activity'
      FROM "activity_types" at
      WHERE at."companyId" = pg."companyId"
        AND (
          (pg.metric = 'tasks_completed' AND at."name" = 'Tarefa')
          OR (pg.metric = 'meetings_held' AND at."name" = 'Reunião')
        )
    `);

    // Índices únicos parciais recriados incluindo activityTypeId, pra permitir
    // várias metas "activity" por pessoa/equipe/período (uma por tipo).
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_productivity_goals_user_metric_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_productivity_goals_team_metric_period"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_productivity_goals_user_metric_period"
        ON "productivity_goals" ("companyId", "userId", "metric", "period", "activityTypeId")
        WHERE "scope" = 'user'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_productivity_goals_team_metric_period"
        ON "productivity_goals" ("companyId", "teamId", "metric", "period", "activityTypeId")
        WHERE "scope" = 'team'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_productivity_goals_user_metric_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_productivity_goals_team_metric_period"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_productivity_goals_user_metric_period"
        ON "productivity_goals" ("companyId", "userId", "metric", "period")
        WHERE "scope" = 'user'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_productivity_goals_team_metric_period"
        ON "productivity_goals" ("companyId", "teamId", "metric", "period")
        WHERE "scope" = 'team'
    `);
    await queryRunner.query(`ALTER TABLE "productivity_goals" DROP CONSTRAINT IF EXISTS "FK_productivity_goals_activity_type"`);
    await queryRunner.query(`ALTER TABLE "productivity_goals" DROP COLUMN IF EXISTS "activityTypeId"`);
    // Não dá pra remover o valor 'activity' do enum (Postgres não suporta DROP VALUE) —
    // fica inofensivo, sem uso, igual aos legados tasks_completed/meetings_held.
  }
}
