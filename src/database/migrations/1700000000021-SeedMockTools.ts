import { MigrationInterface, QueryRunner } from 'typeorm';

// Aponta pro MockApiModule (src/modules/mock-api) — endpoints fake pra demo/teste, registrados
// em qualquer ambiente. A URL base vem de PUBLIC_API_URL pra funcionar em produção também.
const MOCK_BASE_URL = `${process.env.PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/mock`;

const MOCK_TOOLS: {
  name: string;
  description: string;
  url: string;
  parametersSchema: Record<string, any>;
  bodyTemplate: Record<string, any> | null;
}[] = [
  {
    name: 'consultar_cliente_cpf',
    description: 'Consulta os dados cadastrais de um cliente (nome, status, plano) a partir do CPF.',
    url: `${MOCK_BASE_URL}/cliente/{{cpf}}`,
    parametersSchema: { type: 'object', properties: { cpf: { type: 'string', description: 'CPF do cliente, só números' } }, required: ['cpf'] },
    bodyTemplate: null,
  },
  {
    name: 'consultar_parcelas_atraso',
    description: 'Consulta as parcelas em atraso de um cliente a partir do CPF.',
    url: `${MOCK_BASE_URL}/parcelas/{{cpf}}`,
    parametersSchema: { type: 'object', properties: { cpf: { type: 'string', description: 'CPF do cliente, só números' } }, required: ['cpf'] },
    bodyTemplate: null,
  },
  {
    name: 'listar_cidades_atendidas',
    description: 'Lista as cidades atendidas, opcionalmente filtrando por UF.',
    url: `${MOCK_BASE_URL}/cidades`,
    parametersSchema: { type: 'object', properties: { uf: { type: 'string', description: 'Sigla do estado, opcional (ex: SP)' } }, required: [] },
    bodyTemplate: { uf: '{{uf}}' },
  },
  {
    name: 'gerar_segunda_via_boleto',
    description: 'Gera a segunda via de boleto de uma parcela específica, a partir do CPF e do número da parcela.',
    url: `${MOCK_BASE_URL}/boleto/{{cpf}}/{{parcela}}`,
    parametersSchema: {
      type: 'object',
      properties: { cpf: { type: 'string', description: 'CPF do cliente' }, parcela: { type: 'string', description: 'Número da parcela' } },
      required: ['cpf', 'parcela'],
    },
    bodyTemplate: null,
  },
  {
    name: 'simular_negociacao_desconto',
    description: 'Simula uma proposta de desconto pra pagamento à vista, a partir do CPF e do valor em aberto.',
    url: `${MOCK_BASE_URL}/negociacao/{{cpf}}`,
    parametersSchema: {
      type: 'object',
      properties: { cpf: { type: 'string', description: 'CPF do cliente' }, valor: { type: 'number', description: 'Valor original em aberto' } },
      required: ['cpf', 'valor'],
    },
    bodyTemplate: { valor: '{{valor}}' },
  },
  {
    name: 'consultar_endereco_cep',
    description: 'Consulta um endereço (logradouro, bairro, cidade, UF) a partir do CEP.',
    url: `${MOCK_BASE_URL}/cep/{{cep}}`,
    parametersSchema: { type: 'object', properties: { cep: { type: 'string', description: 'CEP, só números' } }, required: ['cep'] },
    bodyTemplate: null,
  },
  {
    name: 'consultar_horarios_disponiveis',
    description: 'Consulta os horários disponíveis pra agendamento de atendimento.',
    url: `${MOCK_BASE_URL}/horarios`,
    parametersSchema: { type: 'object', properties: {}, required: [] },
    bodyTemplate: null,
  },
];

export class SeedMockTools1700000000021 implements MigrationInterface {
  name = 'SeedMockTools1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Opt-in: sem DEMO_SEED_COMPANY_ID configurado, essa seed não faz nada — evita
    // injetar tools fake de demonstração nas contas de clientes reais.
    const companyId = process.env.DEMO_SEED_COMPANY_ID;
    if (!companyId) return;

    const company = await queryRunner.query(`SELECT id FROM companies WHERE id = $1`, [companyId]);
    if (!company.length) return;

    for (const tool of MOCK_TOOLS) {
      const exists = await queryRunner.query(
        `SELECT 1 FROM external_actions WHERE "companyId" = $1 AND name = $2`,
        [companyId, tool.name],
      );
      if (exists.length) continue;

      await queryRunner.query(
        `INSERT INTO external_actions
          (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, 'GET'::"external_actions_method_enum", $4, $5::jsonb, $6::jsonb, true, 8000, now(), now())`,
        [
          companyId,
          tool.name,
          tool.description,
          tool.url,
          JSON.stringify(tool.parametersSchema),
          tool.bodyTemplate ? JSON.stringify(tool.bodyTemplate) : null,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = MOCK_TOOLS.map((t) => t.name);
    await queryRunner.query(`DELETE FROM external_actions WHERE name = ANY($1)`, [names]);
  }
}
