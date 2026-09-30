-- Seed das mock tools de demonstração, só pra empresa 9fea83d6-192a-451b-a48e-fec21569c24f
-- Idempotente: pode rodar mais de uma vez sem duplicar.

DO $$
DECLARE
  v_company_id uuid := '9fea83d6-192a-451b-a48e-fec21569c24f';
  v_base_url text := 'https://api.sende.app.br/api/v1/mock';
BEGIN

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'consultar_cliente_cpf') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'consultar_cliente_cpf',
      'Consulta os dados cadastrais de um cliente (nome, status, plano) a partir do CPF.',
      'GET', v_base_url || '/cliente/{{cpf}}',
      '{"type":"object","properties":{"cpf":{"type":"string","description":"CPF do cliente, só números"}},"required":["cpf"]}'::jsonb,
      NULL, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'consultar_parcelas_atraso') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'consultar_parcelas_atraso',
      'Consulta as parcelas em atraso de um cliente a partir do CPF.',
      'GET', v_base_url || '/parcelas/{{cpf}}',
      '{"type":"object","properties":{"cpf":{"type":"string","description":"CPF do cliente, só números"}},"required":["cpf"]}'::jsonb,
      NULL, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'listar_cidades_atendidas') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'listar_cidades_atendidas',
      'Lista as cidades atendidas, opcionalmente filtrando por UF.',
      'GET', v_base_url || '/cidades',
      '{"type":"object","properties":{"uf":{"type":"string","description":"Sigla do estado, opcional (ex: SP)"}},"required":[]}'::jsonb,
      '{"uf":"{{uf}}"}'::jsonb, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'gerar_segunda_via_boleto') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'gerar_segunda_via_boleto',
      'Gera a segunda via de boleto de uma parcela específica, a partir do CPF e do número da parcela.',
      'GET', v_base_url || '/boleto/{{cpf}}/{{parcela}}',
      '{"type":"object","properties":{"cpf":{"type":"string","description":"CPF do cliente"},"parcela":{"type":"string","description":"Número da parcela"}},"required":["cpf","parcela"]}'::jsonb,
      NULL, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'simular_negociacao_desconto') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'simular_negociacao_desconto',
      'Simula uma proposta de desconto pra pagamento à vista, a partir do CPF e do valor em aberto.',
      'GET', v_base_url || '/negociacao/{{cpf}}',
      '{"type":"object","properties":{"cpf":{"type":"string","description":"CPF do cliente"},"valor":{"type":"number","description":"Valor original em aberto"}},"required":["cpf","valor"]}'::jsonb,
      '{"valor":"{{valor}}"}'::jsonb, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'consultar_endereco_cep') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'consultar_endereco_cep',
      'Consulta um endereço (logradouro, bairro, cidade, UF) a partir do CEP.',
      'GET', v_base_url || '/cep/{{cep}}',
      '{"type":"object","properties":{"cep":{"type":"string","description":"CEP, só números"}},"required":["cep"]}'::jsonb,
      NULL, true, 8000, now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM external_actions WHERE "companyId" = v_company_id AND name = 'consultar_horarios_disponiveis') THEN
    INSERT INTO external_actions (id, "companyId", name, description, method, url, "parametersSchema", "bodyTemplate", "isActive", "timeoutMs", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_company_id, 'consultar_horarios_disponiveis',
      'Consulta os horários disponíveis pra agendamento de atendimento.',
      'GET', v_base_url || '/horarios',
      '{"type":"object","properties":{},"required":[]}'::jsonb,
      NULL, true, 8000, now(), now());
  END IF;

END $$;

-- Conferir o resultado:
SELECT name, url FROM external_actions WHERE "companyId" = '9fea83d6-192a-451b-a48e-fec21569c24f' ORDER BY name;
