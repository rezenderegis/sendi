import { MigrationInterface, QueryRunner } from 'typeorm';

export class TagsSchema1700000000001 implements MigrationInterface {
  name = 'TagsSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "color" character varying NOT NULL,
        "companyId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tags_name_company" UNIQUE ("name", "companyId"),
        CONSTRAINT "PK_tags" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tags_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "conversation_tags" (
        "conversationId" uuid NOT NULL,
        "tagId" uuid NOT NULL,
        CONSTRAINT "PK_conversation_tags" PRIMARY KEY ("conversationId", "tagId"),
        CONSTRAINT "FK_conversation_tags_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversation_tags_tag" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_tags_company" ON "tags" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversation_tags_tag" ON "conversation_tags" ("tagId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "conversation_tags"`);
    await queryRunner.query(`DROP TABLE "tags"`);
  }
}
