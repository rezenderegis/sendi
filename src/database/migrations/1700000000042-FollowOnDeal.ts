import { MigrationInterface, QueryRunner } from 'typeorm';

export class FollowOnDeal1700000000042 implements MigrationInterface {
  name = 'FollowOnDeal1700000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "follow_ons" ADD COLUMN IF NOT EXISTS "dealId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "follow_ons"
        ADD CONSTRAINT "FK_follow_ons_deal"
          FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_follow_ons_dealId" ON "follow_ons" ("dealId")
    `);

    // Backfill: só dá pra saber com certeza qual negócio um follow-on antigo
    // pertence quando o contato tem exatamente 1 deal (sem ambiguidade). Pra
    // contato com 0 ou vários deals, fica null — some da visão "só este
    // negócio" e continua aparecendo na visão "histórico completo do contato".
    await queryRunner.query(`
      UPDATE "follow_ons" f
      SET "dealId" = d."id"
      FROM "deals" d
      WHERE d."contactId" = f."contactId"::uuid
        AND f."dealId" IS NULL
        AND (SELECT COUNT(*) FROM "deals" d2 WHERE d2."contactId" = d."contactId") = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP CONSTRAINT IF EXISTS "FK_follow_ons_deal"`);
    await queryRunner.query(`ALTER TABLE "follow_ons" DROP COLUMN IF EXISTS "dealId"`);
  }
}
