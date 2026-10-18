import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContactCreatedByUserId1700000000031 implements MigrationInterface {
  name = 'ContactCreatedByUserId1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "createdByUserId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD CONSTRAINT "FK_contacts_created_by_user"
          FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contacts_createdByUserId" ON "contacts" ("createdByUserId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_created_by_user"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "createdByUserId"`);
  }
}
