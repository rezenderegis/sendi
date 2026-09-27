import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlowSteps1700000000017 implements MigrationInterface {
  name = 'FlowSteps1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "flows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "startStepId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_flows_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "flow_steps" (
        "id" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "flowId" uuid NOT NULL,
        "questionText" text NOT NULL,
        "options" jsonb NOT NULL,
        "onAnswerActionName" character varying,
        "positionX" double precision NOT NULL DEFAULT 0,
        "positionY" double precision NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flow_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_flow_steps_flow" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_flows_company" ON "flows" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_flow_steps_flow" ON "flow_steps" ("flowId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_flow_steps_flow"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_flows_company"`);
    await queryRunner.query(`DROP TABLE "flow_steps"`);
    await queryRunner.query(`DROP TABLE "flows"`);
  }
}
