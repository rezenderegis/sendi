import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromptToolFlowSelection1700000000018 implements MigrationInterface {
  name = 'PromptToolFlowSelection1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "enabledToolNames" jsonb`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" ADD COLUMN "enabledFlowNames" jsonb`);
    await queryRunner.query(`ALTER TABLE "campaign_prompts" ADD COLUMN "enabledToolNames" jsonb`);
    await queryRunner.query(`ALTER TABLE "campaign_prompts" ADD COLUMN "enabledFlowNames" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign_prompts" DROP COLUMN "enabledFlowNames"`);
    await queryRunner.query(`ALTER TABLE "campaign_prompts" DROP COLUMN "enabledToolNames"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "enabledFlowNames"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN "enabledToolNames"`);
  }
}
