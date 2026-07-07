# Broadcast — Envio de Mensagens em Massa

## Visão geral
Sistema de envio em massa em duas fases: primeiro manual (listas criadas pelo usuário), depois automatizado (regras que consultam os próprios dados do Sendi).

---

## Fase 1 — Broadcast Manual ✅ Implementado

### Objetivo
Permitir que o usuário crie uma lista de transmissão selecionando contatos cadastrados e dispare uma mensagem para todos de uma vez.

### Modelo de dados

```
broadcasts
  id               uuid
  companyId        uuid
  name             string          — ex: "Promoção Julho"
  whatsappNumberId uuid
  type             enum            — text | template
  message          text            — conteúdo se type=text
  templateName     string          — nome do template se type=template
  templateLanguage string          — idioma do template (ex: pt_BR)
  status           enum            — draft | queued | sending | completed | paused | failed
  totalCount       int             — total de destinatários
  sentCount        int             — enviados com sucesso
  failedCount      int             — falhas
  scheduledAt      timestamp       — null = envio imediato
  startedAt        timestamp
  completedAt      timestamp
  createdAt        timestamp

broadcast_recipients
  id          uuid
  broadcastId uuid
  contactId   uuid
  status      enum    — pending | sent | failed | delivered | read
  error       text    — mensagem de erro se failed
  sentAt      timestamp
  createdAt   timestamp
```

### Fluxo

1. Usuário cria campanha (wizard 3 passos na UI):
   - **Passo 1:** define nome, número WhatsApp, tipo (texto ou template) e conteúdo
   - **Passo 2:** seleciona destinatários por tag ou por IDs de contatos
   - **Passo 3:** revisa e confirma envio
2. Sistema cria registro em `broadcasts` (status: `draft`)
3. Destinatários são adicionados via `POST /broadcasts/:id/recipients`
4. Ao confirmar envio, status muda para `queued` e jobs são adicionados ao BullMQ com delay de 1,2s entre envios
5. Processor processa um destinatário por vez
6. Atualiza status de cada `broadcast_recipient` conforme resposta da API
7. Ao terminar todos, status do broadcast muda para `completed`

### Seleção de destinatários por tag

Ao usar `tagId` em `POST /broadcasts/:id/recipients`, o sistema busca contatos em **dois lugares**:
- Conversas que possuem a tag (`conversation_tags`)
- Contatos que possuem a tag diretamente (`contact_tags`)

Os resultados são combinados e deduplicados.

### Seleção de template

Na UI, ao escolher tipo "template", o sistema busca automaticamente os templates aprovados do número selecionado via `GET /whatsapp/numbers/:id/templates`. O usuário seleciona da lista — não digita o nome manualmente.

### API

| Método | Endpoint | Status |
|---|---|---|
| POST | `/broadcasts` | ✅ |
| GET | `/broadcasts` | ✅ |
| GET | `/broadcasts/:id` | ✅ |
| POST | `/broadcasts/:id/recipients` | ✅ |
| POST | `/broadcasts/:id/send` | ✅ |
| POST | `/broadcasts/:id/pause` | ✅ |
| GET | `/broadcasts/:id/recipients` | ✅ |

### Observações
- Contatos fora da janela de 24h do WhatsApp só podem receber **templates aprovados**
- Delay de 1.200ms entre envios para respeitar limites da Meta API
- O progresso (`sentCount`, `failedCount`) é atualizado em tempo real pelo webhook de status
- Broadcast com `totalCount === 0` não pode ser enviado — a UI bloqueia e exibe erro descritivo

### Arquivos

- `src/modules/broadcasts/broadcast.entity.ts`
- `src/modules/broadcasts/broadcast-recipient.entity.ts`
- `src/modules/broadcasts/broadcasts.service.ts`
- `src/modules/broadcasts/broadcasts.controller.ts`
- `src/modules/broadcasts/broadcasts.module.ts`
- `src/modules/broadcasts/broadcast.processor.ts`

---

## Fase 2 — Automações (planejado)

### Objetivo
Permitir criar regras que consultam os próprios dados do Sendi e disparam broadcasts automaticamente com base em critérios definidos pelo usuário.

### Modelo de dados

```
automation_rules
  id               uuid
  companyId        uuid
  name             string        — ex: "Aniversariantes do dia"
  whatsappNumberId uuid
  type             enum          — text | template
  message          text
  templateName     string
  triggerType      enum          — cron
  cronExpression   string        — ex: "0 9 * * *" (todo dia às 9h)
  filterType       enum          — birthday_today | inactive_days | tag | overdue_payment | no_conversation_days
  filterConfig     jsonb         — parâmetros do filtro
  isActive         boolean
  lastRunAt        timestamp
  createdAt        timestamp
```

### Tipos de filtro planejados

| filterType | filterConfig exemplo | Descrição | Pré-requisito |
|---|---|---|---|
| `birthday_today` | `{}` | Contatos com aniversário hoje | Campo `birthDate` no contato |
| `inactive_days` | `{ "days": 90 }` | Contatos sem compra há X dias | Módulo de pedidos |
| `overdue_payment` | `{ "days_overdue": 5 }` | Inadimplentes há X dias | Módulo financeiro |
| `tag` | `{ "tagName": "cliente-vip" }` | Contatos com uma tag específica | ✅ Já disponível |
| `no_conversation_days` | `{ "days": 60 }` | Sem conversa há X dias | ✅ Já disponível |

### Fluxo

1. Usuário cria regra de automação no painel
2. NestJS Scheduler avalia todas as regras ativas na frequência definida pelo cron
3. Para cada regra, executa o filtro correspondente → gera lista de contatos
4. Cria um `broadcast` automaticamente (com `automationRuleId` como referência)
5. Enfileira no BullMQ igual ao broadcast manual
6. Atualiza `lastRunAt` da regra

### API planejada

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/automations` | Criar regra |
| GET | `/automations` | Listar regras |
| PATCH | `/automations/:id` | Editar regra |
| PATCH | `/automations/:id/toggle` | Ativar / pausar |
| GET | `/automations/:id/history` | Histórico de execuções |

---

## Backlog relacionado
- Campo `birthDate` no contato (necessário para filtro de aniversário)
- Módulo de pedidos/vendas (necessário para `inactive_days`)
- Módulo financeiro (necessário para `overdue_payment`)
