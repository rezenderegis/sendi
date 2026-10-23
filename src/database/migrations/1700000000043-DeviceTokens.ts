import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceTokens1700000000043 implements MigrationInterface {
  name = 'DeviceTokens1700000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM ('ios', 'android')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "platform" "public"."device_tokens_platform_enum" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token"),
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        ADD CONSTRAINT "FK_device_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_device_tokens_userId" ON "device_tokens" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "device_tokens_platform_enum"`);
  }
}
