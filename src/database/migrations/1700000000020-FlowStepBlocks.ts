import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlowStepBlocks1700000000020 implements MigrationInterface {
  name = 'FlowStepBlocks1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "flow_steps_steptype_enum" AS ENUM ('choice', 'text', 'content', 'condition', 'action')`,
    );
    await queryRunner.query(
      `ALTER TABLE "flow_steps" ADD COLUMN "stepType" "flow_steps_steptype_enum" NOT NULL DEFAULT 'choice'`,
    );
    await queryRunner.query(`ALTER TABLE "flow_steps" ADD COLUMN "config" jsonb`);
    await queryRunner.query(`
      UPDATE "flow_steps" SET "config" = jsonb_build_object(
        'questionText', "questionText",
        'options', "options",
        'onAnswerActionName', "onAnswerActionName"
      )
    `);
    await queryRunner.query(`ALTER TABLE "flow_steps" ALTER COLUMN "config" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "questionText"`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "options"`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "onAnswerActionName"`);
    await queryRunner.query(`ALTER TABLE "flow_steps" ADD COLUMN "nextStepId" uuid`);

    // Nome do enum segue a convenção padrão do TypeORM ({tabela}_{coluna}_enum). Confirme com
    // `\dT+ conversation_events_type_enum` antes de rodar em produção — mesma ressalva já
    // documentada em 1700000000016-ConversationEventExternalAction.ts.
    await queryRunner.query(`ALTER TYPE "public"."conversation_events_type_enum" ADD VALUE IF NOT EXISTS 'flow_action_executed'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "flow_steps" ADD COLUMN "questionText" text`);
    await queryRunner.query(`ALTER TABLE "flow_steps" ADD COLUMN "options" jsonb`);
    await queryRunner.query(`ALTER TABLE "flow_steps" ADD COLUMN "onAnswerActionName" character varying`);
    await queryRunner.query(`
      UPDATE "flow_steps" SET
        "questionText" = COALESCE("config"->>'questionText', ''),
        "options" = COALESCE("config"->'options', '[]'::jsonb),
        "onAnswerActionName" = "config"->>'onAnswerActionName'
    `);
    await queryRunner.query(`ALTER TABLE "flow_steps" ALTER COLUMN "questionText" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "flow_steps" ALTER COLUMN "options" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "nextStepId"`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "config"`);
    await queryRunner.query(`ALTER TABLE "flow_steps" DROP COLUMN "stepType"`);
    await queryRunner.query(`DROP TYPE "flow_steps_steptype_enum"`);
  }
}
