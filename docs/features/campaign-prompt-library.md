# Biblioteca de Prompts de Campanha

## Visão geral

Prompts de campanha são reutilizáveis. Em vez de digitar o texto a cada broadcast, o operador cria prompts na biblioteca e seleciona ao montar a campanha. O texto é copiado para o broadcast no momento da criação — editar um prompt na biblioteca não altera broadcasts já existentes.

---

## Modelo de dados

### Tabela `campaign_prompts`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `companyId` | uuid | FK → companies |
| `name` | varchar | Nome de exibição (ex: "Vendas - Produto X") |
| `content` | text | Texto do prompt |
| `createdAt` | timestamp | — |
| `updatedAt` | timestamp | — |

> O broadcast armazena o **texto copiado** em `broadcasts.campaignPrompt`, não uma FK. Isso garante que broadcasts enviados não sejam afetados por edições futuras na biblioteca.

---

## API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/campaign-prompts` | Listar todos os prompts da empresa |
| POST | `/campaign-prompts` | Criar prompt |
| PATCH | `/campaign-prompts/:id` | Editar prompt |
| DELETE | `/campaign-prompts/:id` | Excluir prompt |

### Payload

```json
{ "name": "Vendas - Produto X", "content": "Você é um assistente de vendas..." }
```

---

## UI

### Tela de gerenciamento — `/settings/prompts`

- Lista de prompts com nome e preview do conteúdo
- Edição inline (clica no lápis, form aparece no lugar do card)
- Exclusão com confirmação inline (sem modal separado)
- Acesso pelo sidebar em **Configurações → Prompts IA**

### Seletor no wizard de broadcast

No passo **Configuração**, seção "Prompt de campanha":

```
┌─ Prompt de campanha (opcional) ──────────────────────────┐
│  [Selecionar da biblioteca →]                             │
│                                                           │
│  ┌── textarea (editável) ──────────────────────────────┐  │
│  │ Você é um assistente de vendas...                   │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Fluxo:**
1. Clicar em "Selecionar da biblioteca" → modal com busca full-text
2. Selecionar um prompt → nome exibido em badge verde, textarea preenchido
3. O textarea permanece editável — se alterado, badge mostra "(editado)"
4. Botão ✕ no badge limpa a seleção
5. Modal tem link direto para `/settings/prompts` para criar novos prompts

---

## Arquivos

### Backend
- `src/modules/campaign-prompts/campaign-prompt.entity.ts`
- `src/modules/campaign-prompts/campaign-prompts.service.ts`
- `src/modules/campaign-prompts/campaign-prompts.controller.ts`
- `src/modules/campaign-prompts/campaign-prompts.module.ts`
- `src/app.module.ts` — CampaignPromptsModule registrado

### Frontend
- `src/app/(dashboard)/settings/prompts/page.tsx` — gerenciamento
- `src/app/(dashboard)/broadcasts/new/page.tsx` — seletor com modal
- `src/components/layout/sidebar.tsx` — link "Prompts IA"
- `src/types/index.ts` — interface `CampaignPrompt`
