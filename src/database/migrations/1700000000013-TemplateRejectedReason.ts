import { MigrationInterface, QueryRunner } from 'typeorm';

export class TemplateRejectedReason1700000000013 implements MigrationInterface {
  name = 'TemplateRejectedReason1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_templates" ADD COLUMN "rejectedReason" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_templates" DROP COLUMN "rejectedReason"`);
  }
}
