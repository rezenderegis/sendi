import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normaliza todos os telefones na tabela contacts para o formato canônico:
 *  - remove caracteres não-numéricos
 *  - números brasileiros com 12 dígitos (55 + DDD + 8d) ganham o 9º dígito
 *
 * Quando dois contatos da mesma empresa teriam o mesmo telefone normalizado
 * (duplicata), o mais antigo é mantido como "master" e todas as referências
 * (conversas, destinatários de broadcast, tags) são migradas para ele.
 */
export class NormalizeContactPhones1700000000004 implements MigrationInterface {
  name = 'NormalizeContactPhones1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Função SQL temporária para normalizar telefone (espelha normalizePhone() do TypeScript)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION _normalize_phone(raw text) RETURNS text AS $$
      DECLARE
        digits text;
      BEGIN
        digits := regexp_replace(raw, '[^0-9]', '', 'g');
        IF length(digits) = 12 AND digits LIKE '55%' THEN
          RETURN substr(digits, 1, 4) || '9' || substr(digits, 5);
        END IF;
        RETURN digits;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Passo 1a: redirecionar conversas de contatos duplicados para o master (mais antigo)
    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id, m.master_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      UPDATE conversations
      SET "contactId" = d.master_id
      FROM duplicates d
      WHERE conversations."contactId" = d.dup_id
    `);

    // Passo 1b: broadcast_recipients — se master já tem o mesmo broadcastId, apaga a duplicata
    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id, m.master_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      DELETE FROM broadcast_recipients br
      USING duplicates d
      WHERE br."contactId" = d.dup_id
        AND EXISTS (
          SELECT 1 FROM broadcast_recipients existing
          WHERE existing."broadcastId" = br."broadcastId"
            AND existing."contactId"   = d.master_id
        )
    `);

    // Passo 1b (cont): redirecionar os broadcast_recipients restantes das duplicatas
    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id, m.master_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      UPDATE broadcast_recipients br
      SET "contactId" = d.master_id
      FROM duplicates d
      WHERE br."contactId" = d.dup_id
    `);

    // Passo 1c: migrar tags dos contatos duplicados para o master (ignorar conflitos)
    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id, m.master_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      INSERT INTO contact_tags ("contactId", "tagId")
      SELECT DISTINCT d.master_id, ct."tagId"
      FROM contact_tags ct
      JOIN duplicates d ON d.dup_id = ct."contactId"
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      DELETE FROM contact_tags ct
      USING duplicates d
      WHERE ct."contactId" = d.dup_id
    `);

    // Passo 1d: deletar os contatos duplicados (todas as FKs já foram migradas)
    await queryRunner.query(`
      WITH masters AS (
        SELECT DISTINCT ON ("companyId", _normalize_phone(phone))
          id AS master_id,
          "companyId",
          _normalize_phone(phone) AS norm_phone
        FROM contacts
        ORDER BY "companyId", _normalize_phone(phone), "createdAt" ASC
      ),
      duplicates AS (
        SELECT c.id AS dup_id
        FROM contacts c
        JOIN masters m
          ON m."companyId" = c."companyId"
         AND m.norm_phone   = _normalize_phone(c.phone)
        WHERE c.id != m.master_id
      )
      DELETE FROM contacts
      USING duplicates d
      WHERE contacts.id = d.dup_id
    `);

    // Passo 2: normalizar o telefone de todos os contatos restantes
    await queryRunner.query(`
      UPDATE contacts
      SET phone = _normalize_phone(phone)
      WHERE phone != _normalize_phone(phone)
    `);

    // Remove a função temporária
    await queryRunner.query(`DROP FUNCTION IF EXISTS _normalize_phone(text)`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Normalização de telefones não é reversível com segurança.
  }
}
