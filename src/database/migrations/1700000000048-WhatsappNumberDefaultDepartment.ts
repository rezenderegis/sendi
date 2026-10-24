import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappNumberDefaultDepartment1700000000048 implements MigrationInterface {
  name = 'WhatsappNumberDefaultDepartment1700000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_numbers" ADD COLUMN IF NOT EXISTS "defaultDepartmentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_numbers"
        ADD CONSTRAINT "FK_whatsapp_numbers_default_department"
          FOREIGN KEY ("defaultDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP CONSTRAINT IF EXISTS "FK_whatsapp_numbers_default_department"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN IF EXISTS "defaultDepartmentId"`);
  }
}
