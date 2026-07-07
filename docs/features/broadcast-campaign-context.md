# Broadcast — Contexto de Campanha

## Visão geral

Permite associar um prompt específico a um broadcast. Quando o contato responde, o bot usa esse prompt ao invés do prompt padrão do número, mantendo o contexto da campanha (ex: vendas, reativação). A primeira resposta do contato é automaticamente classificada por sentimento (positivo / negativo / neutro).

> Ver também: [Biblioteca de Prompts](./campaign-prompt-library.md) — reutilização de prompts entre broadcasts.

---

## Regras de negócio

### Ativação
- Ativado na conversa **no momento em que o broadcast é enviado ao contato**
- Só é ativado se o broadcast tiver `campaignPrompt` preenchido

### Expiração — o que vier primeiro
1. **72 horas** após o envio
2. **Atendente humano envia uma mensagem** via `POST /whatsapp/messages/send` — limpo automaticamente
3. **Reset manual** pelo atendente via UI ou `PATCH /conversations/:id/campaign/reset`

### Prioridade de prompt na IA
```
conversation.campaignPrompt  (ativo e não expirado)
    ↓ senão
whatsappNumber.systemPrompt
    ↓ senão
prompt padrão do servidor
```

### Classificação de sentimento
- Na **primeira** resposta inbound do contato após o envio do broadcast
- A IA classifica o texto como `positive`, `negative` ou `neutral`
- Resultado salvo em `broadcast_recipients.responseSentiment`
- Classificações seguintes são ignoradas (apenas a primeira conta)

---

## Modelo de dados

### `broadcasts`
```
campaignPrompt    text | null   — prompt desta campanha (copiado da biblioteca ou digitado)
```

### `conversations`
```
campaignPrompt      text | null       — prompt ativo na conversa
campaignBroadcastId uuid | null       — broadcast que originou o contexto
campaignExpiresAt   timestamp | null  — expiração (envio + 72h)
```

### `broadcast_recipients`
```
respondedAt         timestamp | null  — quando o contato respondeu pela primeira vez
responseSentiment   enum | null       — positive | negative | neutral
```

---

## Fluxo completo

```
1. Operador cria broadcast com campaignPrompt preenchido (direto ou via biblioteca)
2. Broadcast processor envia mensagem para cada contato

3. Para cada envio bem-sucedido (status = SENT):
   → busca a conversa do contato para esse número
   → se encontrada:
       conversation.campaignPrompt      = broadcast.campaignPrompt
       conversation.campaignBroadcastId = broadcast.id
       conversation.campaignExpiresAt   = now + 72h

4. Contato responde (inbound) → WhatsappProcessor:
   → salva mensagem
   → se conversation.campaignBroadcastId e recipient.respondedAt == null:
       → classifica sentimento via IA → salva em recipient
   → verifica se campaignPrompt existe E campaignExpiresAt > now
   → usa campaignPrompt para gerar resposta da IA (senão usa systemPrompt)

5. Atendente humano envia mensagem (POST /whatsapp/messages/send):
   → após salvar mensagem, se conversation.campaignPrompt != null:
       → chama resetCampaignContext → limpa os 3 campos

6. Reset manual (PATCH /conversations/:id/campaign/reset):
   → mesmo efeito do item 5
```

---

## API

| Método | Endpoint | Descrição |
|---|---|---|
| PATCH | `/conversations/:id/campaign/reset` | Resetar contexto manualmente |
| GET | `/broadcasts/:id/responses` | Ver respostas + sentimento + status de conversa |

Ver [broadcast.md](./broadcast.md) para os demais endpoints de broadcast.

---

## UI — Wizard de broadcast (passo Configuração)

Seção "Prompt de campanha" com:
- Botão **"Selecionar da biblioteca"** → modal com busca (ver [campaign-prompt-library.md](./campaign-prompt-library.md))
- Textarea editável (pode digitar avulso ou editar o selecionado)
- Badge verde mostra o nome do prompt selecionado; "(editado)" se o texto foi alterado
- Hint: "Ativo por 72h ou até um atendente responder"

---

## UI — Conversa (tela de atendimento)

Badge âmbar/laranja na faixa de controles quando contexto está ativo:

```
┌────────────────────────────────────────────────┐
│ ⚡ Campanha ativa · expira em 48h          [✕]  │
└────────────────────────────────────────────────┘
```

- Ícone `Zap` + tempo restante calculado em tempo real
- Botão ✕ chama `PATCH /conversations/:id/campaign/reset`
- Some automaticamente quando expirado ou resetado

---

## UI — Página de detalhe do broadcast (`/broadcasts/:id`)

Duas abas:

**Responderam**
- Ícone de sentimento (😊 positivo / 😐 neutro / 😞 negativo)
- Nome e telefone do contato
- Status da conversa (aberta / fechada / pendente)
- Tempo de resposta
- Preview das primeiras mensagens inbound
- Botão "Abrir" → navega para a conversa

**Sem resposta**
- Lista de contatos que receberam mas não responderam
- Status da conversa se já existe

**Estatísticas no topo**
- Responderam / Taxa de resposta / Tempo médio
- Breakdown de sentimento: positivo · neutro · negativo

---

## Arquivos

### Backend
| Arquivo | Alteração |
|---|---|
| `broadcasts/broadcast.entity.ts` | campo `campaignPrompt` |
| `broadcasts/broadcast.processor.ts` | grava contexto na conversa após envio; classifica sentimento na 1ª resposta |
| `broadcasts/broadcast-recipient.entity.ts` | campos `respondedAt`, `responseSentiment` |
| `broadcasts/broadcasts.service.ts` | método `getResponses` |
| `broadcasts/broadcasts.controller.ts` | `GET /broadcasts/:id/responses` |
| `conversations/conversation.entity.ts` | campos `campaignPrompt`, `campaignBroadcastId`, `campaignExpiresAt` |
| `conversations/conversations.service.ts` | método `resetCampaignContext` |
| `conversations/conversations.controller.ts` | `PATCH /conversations/:id/campaign/reset` |
| `whatsapp/whatsapp.processor.ts` | usa `campaignPrompt` na IA; classifica sentimento |
| `whatsapp/whatsapp.service.ts` | limpa contexto ao humano enviar mensagem |
| `ai/ai.service.ts` | método `classifySentiment` |

### Frontend
| Arquivo | Alteração |
|---|---|
| `broadcasts/new/page.tsx` | seletor de prompt com modal |
| `broadcasts/[id]/page.tsx` | página de respostas com sentimento e links |
| `conversations/[id]/page.tsx` | badge de campanha ativa com timer e reset |
| `types/index.ts` | `CampaignPrompt`, `BroadcastResponses`, campos em `Conversation` e `Broadcast` |
