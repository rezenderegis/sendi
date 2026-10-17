import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactDealFields1700000000027 implements MigrationInterface {
  name = 'ContactDealFields1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN IF NOT EXISTS "kanbanColumnChangedAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "dealValue" decimal(12,2),
        ADD COLUMN IF NOT EXISTS "dealOwnerId" uuid,
        ADD COLUMN IF NOT EXISTS "lostAt" timestamptz,
        ADD COLUMN IF NOT EXISTS "lostReason" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD CONSTRAINT "FK_contacts_deal_owner"
          FOREIGN KEY ("dealOwnerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_deal_owner"`);
    await queryRunner.query(`
      ALTER TABLE "contacts"
        DROP COLUMN IF EXISTS "kanbanColumnChangedAt",
        DROP COLUMN IF EXISTS "dealValue",
        DROP COLUMN IF EXISTS "dealOwnerId",
        DROP COLUMN IF EXISTS "lostAt",
        DROP COLUMN IF EXISTS "lostReason"
    `);
  }
}
