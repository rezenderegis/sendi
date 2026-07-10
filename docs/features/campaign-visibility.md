# Visibilidade de Contexto de Campanha

## Visão geral

Conjunto de melhorias para dar visibilidade sobre o que acontece com o contexto de campanha em cada conversa: qual prompt a IA usou em cada mensagem, histórico de eventos (ativação, reset, expiração) e indicador na lista de conversas.

> Ver também: [Contexto de Campanha](./broadcast-campaign-context.md) — regras de negócio e fluxo completo.

---

## 1. Qual prompt a IA usou por mensagem

Cada mensagem outbound gerada pelo bot tem o campo `aiPromptSource` preenchido:

| Valor | Significado |
|---|---|
| `campaign` | Usou o prompt do broadcast ativo |
| `system` | Usou o `systemPrompt` do número WhatsApp |
| `default` | Usou o prompt padrão do servidor (nenhum configurado) |

### Como aparece na UI
Nas mensagens de saída da conversa, um badge discreto aparece ao lado do horário:
- 🟠 `⚡ campanha` — fundo laranja translúcido (destaque)
- `prompt do número` ou `padrão` — fundo branco translúcido

Mensagens enviadas por humanos e mensagens de sistema (pedido de nome, transferência para atendente) não têm `aiPromptSource`.

### Implementação
- **Entidade:** campo `aiPromptSource: string | null` em `messages` (coluna nullable)
- **Processor:** `whatsapp.processor.ts` determina o source antes de chamar a IA e passa para `sendBotReply`
- **Service:** `whatsapp.service.ts` → `sendBotReply` aceita `aiPromptSource?` e grava na mensagem via `saveMessage`

---

## 2. Histórico de eventos de contexto

Tabela `conversation_events` registra cada mudança de estado do contexto de campanha em uma conversa.

### Tipos de evento

| Tipo | Quando ocorre |
|---|---|
| `campaign_activated` | Broadcast processor ativa o contexto após envio bem-sucedido |
| `campaign_reset_human` | Atendente humano envia mensagem via `POST /whatsapp/messages/send` |
| `campaign_reset_manual` | Atendente clica no ✕ do badge âmbar ou chama `PATCH /conversations/:id/campaign/reset` |
| `campaign_expired` | WhatsApp processor detecta que `campaignExpiresAt <= now` ao processar uma resposta |

### Metadados por evento

**`campaign_activated`**
```json
{
  "broadcastId": "uuid",
  "broadcastName": "Nome do broadcast",
  "promptPreview": "primeiros 120 caracteres do prompt",
  "expiresAt": "2025-01-01T00:00:00.000Z"
}
```

Demais tipos não têm metadados (apenas `conversationId`, `type`, `createdAt`).

### API
```
GET /conversations/:id/events
→ ConversationEvent[] ordenados por createdAt DESC
```

### Como aparece na UI
Botão **"Histórico"** no cabeçalho da conversa. Ao clicar:
- Abre um painel colapsável entre os controles e as mensagens
- Lista os eventos com ícone, descrição e data/hora
- Para `campaign_activated`: mostra nome do broadcast, data de expiração e preview do prompt em itálico

---

## 3. Indicador na lista de conversas

Na tela `/conversations`, conversas com contexto de campanha ativo exibem um badge âmbar `⚡ Campanha` ao lado do status e tags.

**Condição de exibição:** `campaignPrompt != null AND campaignExpiresAt > now`

---

## 4. Correção — tags de conversa visíveis na tela de configurações

**Problema:** ao clicar em uma tag na tela `/settings/tags`, o painel de contatos mostrava "Nenhum contato com esta tag" mesmo com contatos tagueados via conversas.

**Causa:** `contacts.service.ts::findByTag` consultava apenas `contact_tags` (tags diretas no contato), mas as tags atribuídas na tela de atendimento ficam em `conversation_tags`.

**Correção:** `findByTag` agora faz duas queries em paralelo e mescla os resultados:
1. Contatos com a tag em `contact_tags`
2. Contatos cujas conversas têm a tag em `conversation_tags`

---

## Modelo de dados

### `conversation_events`
```
id              uuid PK
conversationId  uuid FK → conversations.id
type            enum (campaign_activated | campaign_reset_human | campaign_reset_manual | campaign_expired)
metadata        jsonb | null
createdAt       timestamp
```

### `messages` (campo adicionado)
```
aiPromptSource  varchar | null   — 'campaign' | 'system' | 'default'
```

---

## Arquivos modificados

### Backend
| Arquivo | Alteração |
|---|---|
| `conversations/conversation-event.entity.ts` | nova entidade |
| `conversations/message.entity.ts` | campo `aiPromptSource` |
| `conversations/conversations.service.ts` | métodos `createEvent`, `getEvents`; `saveMessage` aceita `aiPromptSource`; `resetCampaignContext` aceita `eventType` |
| `conversations/conversations.controller.ts` | `GET /conversations/:id/events` |
| `conversations/conversations.module.ts` | registra `ConversationEvent` |
| `whatsapp/whatsapp.processor.ts` | determina `aiPromptSource`; loga `campaign_expired` |
| `whatsapp/whatsapp.service.ts` | `sendBotReply` aceita e grava `aiPromptSource`; loga `campaign_reset_human` |
| `broadcasts/broadcast.processor.ts` | loga `campaign_activated` |
| `broadcasts/broadcasts.module.ts` | registra `ConversationEvent` |
| `contacts/contacts.service.ts` | `findByTag` inclui `conversation_tags` |

### Frontend
| Arquivo | Alteração |
|---|---|
| `types/index.ts` | `AiPromptSource`, `ConversationEventType`, `ConversationEvent`; campo `aiPromptSource` em `Message` |
| `conversations/page.tsx` | badge `⚡ Campanha` na lista |
| `conversations/[id]/page.tsx` | badge de prompt em mensagens da IA; botão + painel "Histórico" |
