import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoalMemberQuotas1700000000034 implements MigrationInterface {
  name = 'GoalMemberQuotas1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "goal_member_quotas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "goalId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "quota" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_goal_member_quotas" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "goal_member_quotas"
        ADD CONSTRAINT "FK_goal_member_quotas_goal"
          FOREIGN KEY ("goalId") REFERENCES "productivity_goals"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_goal_member_quotas_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_goal_member_quotas_goal_user" ON "goal_member_quotas" ("goalId", "userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "goal_member_quotas"`);
  }
}
