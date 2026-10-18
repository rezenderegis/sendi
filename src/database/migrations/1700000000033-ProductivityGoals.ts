import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductivityGoals1700000000033 implements MigrationInterface {
  name = 'ProductivityGoals1700000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."productivity_goals_scope_enum" AS ENUM('user', 'team')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."productivity_goals_metric_enum" AS ENUM(
        'contacts_created', 'followup_messages', 'tasks_completed', 'meetings_held'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."productivity_goals_period_enum" AS ENUM('day', 'week', 'month')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "productivity_goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "scope" "public"."productivity_goals_scope_enum" NOT NULL,
        "userId" uuid,
        "teamId" uuid,
        "metric" "public"."productivity_goals_metric_enum" NOT NULL,
        "targetCount" integer NOT NULL,
        "period" "public"."productivity_goals_period_enum" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_productivity_goals" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "productivity_goals"
        ADD CONSTRAINT "FK_productivity_goals_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_productivity_goals_team"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_productivity_goals_companyId" ON "productivity_goals" ("companyId")
    `);
    // Impede meta duplicada pro mesmo alvo/métrica/período — um índice por escopo,
    // já que userId/teamId são mutuamente exclusivos conforme o escopo.
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "productivity_goals"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."productivity_goals_period_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."productivity_goals_metric_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."productivity_goals_scope_enum"`);
  }
}
