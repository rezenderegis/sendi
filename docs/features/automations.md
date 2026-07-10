# Automações

Módulo de disparo automático de mensagens WhatsApp baseado em eventos do ciclo de vida do cliente.

## Visão geral

O sistema roda um **cron diário às 08:00** que avalia todas as regras ativas de todas as empresas e envia mensagens para os contatos que qualificam. Reutiliza o `WhatsappService.sendMessage` (mesmo serviço do broadcast) para o envio efetivo.

---

## Gatilhos disponíveis

### `birthday` — Aniversário
Dispara para contatos cujo mês+dia de `birthDate` coincide com a data alvo.

- **Data alvo** = hoje + `triggerOffsetDays`
- Offset negativo = antecipação (ex: `-1` = dia anterior ao aniversário)
- **Variáveis de mensagem**: `{nome}`, `{primeiro_nome}`
- **Deduplicação**: uma execução por contato por ano (`birthday-{ano}`)

### `payment_overdue` — Pagamento em atraso
Dispara para vendas com `paymentStatus = pending` cujo `dueDate` corresponde à data alvo.

- **Data alvo** = hoje − `triggerOffsetDays`
- Offset positivo = dias após o vencimento (ex: `3` = cobra 3 dias depois de vencer)
- **Variáveis de mensagem**: `{nome}`, `{primeiro_nome}`, `{produto}`, `{data_vencimento}`, `{dias_atraso}`
- **Deduplicação**: uma execução por venda (`overdue-{saleId}`)

### `repurchase` — Recompra
Dispara quando hoje = última compra do contato + intervalo de recompra.

- Intervalo: usa `contact_product_settings.repurchaseIntervalDays` se existir, senão `product.repurchaseIntervalDays`
- Agrupa por `(contactId, productId)` e pega a última venda de cada par
- **Data alvo** = hoje − `triggerOffsetDays`
- **Variáveis de mensagem**: `{nome}`, `{primeiro_nome}`, `{produto}`
- **Deduplicação**: uma execução por (produto, ciclo) (`repurchase-{productId}-{data}`)

---

## Deduplicação

Tabela `automation_executions` com constraint única em `(ruleId, contactId, dedupeKey)`.

Antes de cada envio, o sistema verifica se já existe uma execução com essa chave. Se sim, pula. Garante que o mesmo evento não dispare duas vezes mesmo que o cron rode mais de uma vez por dia.

---

## Estrutura de dados

### `automation_rules`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `companyId` | uuid | Empresa |
| `name` | varchar | Nome amigável da regra |
| `type` | enum | `birthday` \| `payment_overdue` \| `repurchase` |
| `whatsappNumberId` | uuid | Número que vai enviar |
| `triggerOffsetDays` | int | Dias antes (negativo) ou depois (positivo) do evento |
| `messageTemplate` | text | Mensagem com variáveis `{nome}` etc |
| `isActive` | bool | Liga/desliga sem excluir |

### `automation_executions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `ruleId` | uuid | FK → automation_rules |
| `contactId` | uuid | FK → contacts |
| `dedupeKey` | varchar | Chave de deduplicação (ver acima) |
| `status` | enum | `sent` \| `failed` |
| `error` | text | Mensagem de erro se falhou |
| `createdAt` | timestamp | Quando foi executado |

---

## API

```
GET    /automations                          Lista regras da empresa
GET    /automations/:id                      Detalhe da regra
POST   /automations                          Cria regra
PATCH  /automations/:id                      Atualiza regra (incl. isActive para ligar/desligar)
DELETE /automations/:id                      Exclui regra
GET    /automations/:id/executions           Histórico dos últimos 100 disparos
```

### Exemplo de criação

```json
POST /automations
{
  "name": "Parabéns aniversariantes",
  "type": "birthday",
  "whatsappNumberId": "uuid-do-numero",
  "triggerOffsetDays": 0,
  "messageTemplate": "Olá {primeiro_nome}! 🎂 Feliz aniversário! Te esperamos em breve."
}
```

---

## Recorrência personalizada por cliente

Tabela `contact_product_settings` permite que um cliente tenha um intervalo de recompra diferente do padrão do produto.

Exemplo: produto "Corte masculino" tem `repurchaseIntervalDays = 30`, mas João tem override de `15` dias.

```
GET    /contact-product-settings/contact/:contactId          Lista overrides do contato
PUT    /contact-product-settings/contact/:contactId/product/:productId   Cria/atualiza override
DELETE /contact-product-settings/contact/:contactId/product/:productId   Remove override (volta ao padrão)
```

O override é visível e editável na aba "Vendas" do modal do contato no frontend.

---

## Frontend

- **`/automations`**: página de gerenciamento de regras
  - Formulário de criação/edição com seletor de gatilho, número, offset e template
  - Chips clicáveis para inserir variáveis na mensagem
  - Histórico de execuções por regra (últimos 100)
  - Toggle de ativo/inativo sem excluir
- **Sidebar**: entrada "Automações" (ícone Zap) na seção Vendas

---

## Limitações conhecidas (v1)

- Envia apenas mensagens de **texto livre**. Para usar templates aprovados pela Meta, o usuário deve criar uma regra com `type = template` no broadcast normal e repetir manualmente.
- O cron roda uma vez ao dia. Se o servidor estiver fora no horário, o disparo do dia é perdido (não há recuperação retroativa).
- Para `payment_overdue`, se o cliente tiver duas vendas vencendo no mesmo dia, apenas um disparo é enviado (deduplicação por contato+data).
