import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationDepartment1700000000046 implements MigrationInterface {
  name = 'ConversationDepartment1700000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "departmentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "conversations"
        ADD CONSTRAINT "FK_conversations_department"
          FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversations_departmentId" ON "conversations" ("departmentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_department"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "departmentId"`);
  }
}
