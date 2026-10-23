import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceTokenSound1700000000044 implements MigrationInterface {
  name = 'DeviceTokenSound1700000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "device_tokens" ADD COLUMN IF NOT EXISTS "soundEnabled" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "device_tokens" DROP COLUMN IF EXISTS "soundEnabled"`);
  }
}
