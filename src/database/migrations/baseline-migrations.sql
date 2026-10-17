-- Nivela a tabela "migrations" para refletir que o schema já tem todas as
-- migrations abaixo aplicadas (caso do banco restaurado via dump/restore,
-- que foi criado via synchronize e nunca rodou migration de verdade).
-- Rodar UMA VEZ no banco novo, antes do primeiro "migration:run" por lá.
-- Idempotente: pode rodar de novo sem duplicar (ON CONFLICT faz nada).

-- O dump/restore trouxe as tabelas da aplicação mas não a tabela de
-- controle do TypeORM — cria ela com a mesma estrutura que ele usa.
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  timestamp bigint NOT NULL,
  name character varying NOT NULL
);

INSERT INTO migrations (timestamp, name) VALUES
  (1700000000000, 'InitialSchema1700000000000'),
  (1700000000001, 'TagsSchema1700000000001'),
  (1700000000002, 'ContactsNewFields1700000000002'),
  (1700000000003, 'ConversationAiState1700000000003'),
  (1700000000004, 'NormalizeContactPhones1700000000004'),
  (1700000000005, 'UserTokenVersion1700000000005'),
  (1700000000006, 'ConversationWaitingReply1700000000006'),
  (1700000000007, 'CreateLeads1700000000007'),
  (1700000000008, 'CreateKanbanColumns1700000000008'),
  (1700000000009, 'LeadBrand1700000000009'),
  (1700000000010, 'FollowOnSoftDelete1700000000010'),
  (1700000000011, 'UsageAndBilling1700000000011'),
  (1700000000012, 'CategoryPricing1700000000012'),
  (1700000000013, 'TemplateRejectedReason1700000000013'),
  (1700000000014, 'BroadcastSkipIfAlreadyMessaged1700000000014'),
  (1700000000015, 'ExternalActions1700000000015'),
  (1700000000016, 'ConversationEventExternalAction1700000000016'),
  (1700000000017, 'FlowSteps1700000000017'),
  (1700000000018, 'PromptToolFlowSelection1700000000018'),
  (1700000000019, 'ConversationVariables1700000000019'),
  (1700000000020, 'FlowStepBlocks1700000000020'),
  (1700000000021, 'SeedMockTools1700000000021'),
  (1700000000022, 'WebhookTriggers1700000000022'),
  (1700000000023, 'SpendGuardrails1700000000023'),
  (1700000000024, 'KanbanOnContactFollowOnOnContact1700000000024'),
  (1700000000025, 'AddNoteFollowOnType1700000000025')
ON CONFLICT DO NOTHING;
