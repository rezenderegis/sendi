import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteFollowOnType1700000000025 implements MigrationInterface {
  name = 'AddNoteFollowOnType1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // "note" é um registro instantâneo (sem agendamento/pendência), diferente
    // das atividades (reunião/ligação/mensagem) que têm um ciclo pendente → concluído.
    await queryRunner.query(`ALTER TYPE "follow_ons_type_enum" ADD VALUE IF NOT EXISTS 'note'`);
  }

  public async down(): Promise<void> {
    // Postgres não suporta remover um valor de enum (sem recriar o tipo);
    // não há down seguro aqui — manter o valor extra é inofensivo.
  }
}
