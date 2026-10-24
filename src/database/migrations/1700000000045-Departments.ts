import { MigrationInterface, QueryRunner } from 'typeorm';

export class Departments1700000000045 implements MigrationInterface {
  name = 'Departments1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_departments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "departments"
        ADD CONSTRAINT "FK_departments_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_departments_companyId" ON "departments" ("companyId")`);

    // M:N direto (sem entidade dedicada), mesmo padrão de conversation_tags.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "department_members" (
        "departmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_department_members" PRIMARY KEY ("departmentId", "userId"),
        CONSTRAINT "FK_department_members_department" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_department_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_department_members_userId" ON "department_members" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "department_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
  }
}
