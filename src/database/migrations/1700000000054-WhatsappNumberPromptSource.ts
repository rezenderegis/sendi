import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappNumberPromptSource1700000000054 implements MigrationInterface {
  name = 'WhatsappNumberPromptSource1700000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_numbers" ADD COLUMN IF NOT EXISTS "promptSourceId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_numbers"
        ADD CONSTRAINT "FK_whatsapp_numbers_prompt_source"
          FOREIGN KEY ("promptSourceId") REFERENCES "campaign_prompts"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP CONSTRAINT IF EXISTS "FK_whatsapp_numbers_prompt_source"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_numbers" DROP COLUMN IF EXISTS "promptSourceId"`);
  }
}
