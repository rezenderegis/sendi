# Contatos — Filtro por Broadcast e Ações em Massa

## Visão geral

Permite filtrar a lista de contatos por broadcast (com sub-filtro de situação) e executar ações em massa sobre múltiplos contatos selecionados — atualmente: adicionar a uma tag.

---

## Filtro por broadcast

### Como usar
Na tela de contatos (`/contacts`), dois dropdowns aparecem na barra de filtros:

1. **Broadcast** — lista todos os broadcasts da empresa. Ao selecionar um, a lista mostra apenas os contatos que estavam naquele envio (destinatários de `broadcast_recipients`).

2. **Situação** — aparece automaticamente quando um broadcast está selecionado:
   - *Todas as situações* — todos os destinatários
   - *Responderam* — `respondedAt IS NOT NULL`
   - *Sem resposta* — `status = 'sent' AND respondedAt IS NULL`
   - *Falha na entrega* — `status = 'failed'`

O botão ✕ limpa ambos os filtros de uma vez. O subtítulo da página mostra o broadcast e situação ativos.

### Implementação

**Backend** — `GET /contacts` aceita dois query params opcionais:
- `broadcastId` — filtra via subquery em `broadcast_recipients`
- `broadcastResponseFilter` — restringe a subquery por situação

```
GET /contacts?broadcastId=<uuid>&broadcastResponseFilter=responded
```

Valores válidos de `broadcastResponseFilter`: `responded`, `no_response`, `failed`.

**Arquivo:** `contacts/contacts.service.ts` → método `findAll(companyId, broadcastId?, broadcastResponseFilter?)`

---

## Salvar broadcast como tag

Na página de detalhe de um broadcast (`/broadcasts/:id`), o botão **"Salvar como tag"** cria automaticamente uma tag com todos os destinatários do broadcast.

### Comportamento
- Nome da tag: `Broadcast: [nome do broadcast]`
- Se a tag já existir (clique duplicado), apenas adiciona os contatos que ainda não estão nela — sem duplicar
- Disponível em qualquer status do broadcast (draft, sending, completed, etc.)
- Desabilitado se o broadcast não tiver destinatários

### Implementação

**Backend** — `POST /broadcasts/:id/save-as-tag`

```
POST /broadcasts/:id/save-as-tag
→ 200 { id, name, color, companyId, ... }  ← a tag criada/encontrada
```

Usa `INSERT ... ON CONFLICT DO NOTHING` na tabela `contact_tags` para evitar duplicatas sem precisar verificar uma a uma.

**Arquivo:** `broadcasts/broadcasts.service.ts` → método `saveAsTag(id, companyId)`

---

## Seleção múltipla e bulk tag

### Como usar

1. Checkboxes aparecem no lado esquerdo de cada linha de contato
2. Clicar no checkbox de cabeçalho (linha cinza acima da lista) seleciona/deseleciona todos os visíveis (respeitando busca e filtros ativos)
3. Ao selecionar qualquer contato, uma **barra flutuante** aparece na parte inferior da tela:
   - Contagem de selecionados
   - Botão **"Adicionar à tag"** → abre dropdown com busca de tags
   - Ao clicar em uma tag: adiciona todos os selecionados em paralelo via `POST /contacts/:id/tags`
   - Após sucesso: invalida cache, limpa seleção, exibe toast de confirmação
   - Botão ✕ cancela a seleção

### Comportamento
- A seleção é local (não persiste ao trocar de filtro)
- "Selecionar todos" seleciona apenas os contatos visíveis (após busca/filtro), não todos do banco
- A linha selecionada fica com fundo verde-claro para feedback visual
- O dropdown de tags tem busca por nome

### Implementação

Apenas frontend — usa a API existente `POST /contacts/:id/tags` em paralelo.

**Arquivo:** `(dashboard)/contacts/page.tsx`

---

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `contacts/contacts.service.ts` | `findAll` aceita `broadcastId` e `broadcastResponseFilter` |
| `contacts/contacts.controller.ts` | `GET /contacts` repassa os dois novos query params |
| `broadcasts/broadcasts.service.ts` | método `saveAsTag` |
| `broadcasts/broadcasts.controller.ts` | `POST /broadcasts/:id/save-as-tag` |
| `(dashboard)/contacts/page.tsx` | filtros de broadcast + multi-select + barra de bulk actions |
| `(dashboard)/broadcasts/[id]/page.tsx` | botão "Salvar como tag" |
