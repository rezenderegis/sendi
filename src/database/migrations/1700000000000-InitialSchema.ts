import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."companies_plan_enum" AS ENUM('free', 'starter', 'pro', 'enterprise')
    `);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "plan" "public"."companies_plan_enum" NOT NULL DEFAULT 'free',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_companies_email" UNIQUE ("email"),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'admin', 'agent')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'agent',
        "companyId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "whatsapp_numbers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "phoneNumberId" character varying NOT NULL,
        "wabaId" character varying NOT NULL,
        "accessToken" character varying NOT NULL,
        "phoneNumber" character varying NOT NULL,
        "displayName" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "webhookVerifyToken" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_numbers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_numbers_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "phone" character varying NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contacts_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."conversations_status_enum" AS ENUM('open', 'closed', 'pending')
    `);

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "companyId" uuid NOT NULL,
        "contactId" uuid NOT NULL,
        "whatsappNumberId" uuid NOT NULL,
        "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'open',
        "lastMessageAt" TIMESTAMP,
        "assignedUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversations_contact" FOREIGN KEY ("contactId") REFERENCES "contacts"("id"),
        CONSTRAINT "FK_conversations_whatsapp_number" FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id"),
        CONSTRAINT "FK_conversations_assigned_user" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."messages_direction_enum" AS ENUM('inbound', 'outbound')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'audio', 'video', 'document', 'template')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "direction" "public"."messages_direction_enum" NOT NULL,
        "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text',
        "content" text NOT NULL,
        "whatsappMessageId" character varying,
        "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent',
        "metadata" jsonb,
        "sentAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_messages_whatsapp_id" ON "messages" ("whatsappMessageId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_conversation" ON "messages" ("conversationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_conversations_company" ON "conversations" ("companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contacts_phone_company" ON "contacts" ("phone", "companyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_whatsapp_phone_number_id" ON "whatsapp_numbers" ("phoneNumberId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TABLE "whatsapp_numbers"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_direction_enum"`);
    await queryRunner.query(`DROP TYPE "public"."conversations_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."companies_plan_enum"`);
  }
}
