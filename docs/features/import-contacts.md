# Importação de Contatos via Planilha

## Visão geral
Permite importar contatos em massa a partir de arquivos CSV ou XLSX, com suporte a criação automática de tags por linha ou por import global.

---

## Status
🔲 Pendente de implementação (tag na importação)
✅ Importação básica (nome, telefone, email, empresa, notas) já implementada

---

## Fluxo

1. Usuário clica em "Importar planilha" na tela de Contatos
2. Abre um modal com:
   - Seletor de arquivo (.csv, .xlsx, .xls)
   - Campo de **tag global** (busca + criação, opcional)
3. Ao confirmar, o arquivo e a tag global são enviados ao backend
4. Backend processa linha a linha e retorna resumo
5. UI exibe toast: `X criados · Y atualizados · Z erros`

---

## Lógica de tags por linha

| Situação | Tags aplicadas ao contato |
|---|---|
| Planilha tem coluna `tag`, célula preenchida | Tags da célula + tag global (se informada) |
| Planilha tem coluna `tag`, célula vazia | Tag global (se informada), ou nenhuma |
| Planilha não tem coluna `tag` | Tag global (se informada), ou nenhuma |

- Múltiplas tags na célula separadas por vírgula: `cliente vip, promo julho`
- Tags inexistentes são **criadas automaticamente**
- A tag global é **acumulativa** — aplica em todos os contatos além das tags da coluna

---

## Colunas da planilha

| Coluna | Obrigatório | Aliases reconhecidos |
|---|---|---|
| telefone | ✅ | `phone`, `celular`, `whatsapp`, `fone` |
| nome | — | `name` |
| email | — | `email` |
| empresa | — | `company`, `companyName` |
| notas | — | `notes`, `observacoes`, `observações` |
| codigo | — | `externalId`, `external_id`, `id_externo`, `código` |
| tag | — | `tags`, `etiqueta`, `etiquetas` |

---

## Backend — alterações necessárias

### `contacts.controller.ts`
- Adicionar campo `globalTagName` (string, opcional) ao form multipart do endpoint `POST /contacts/import`

### `contacts.service.ts`
- `importFromFile` recebe parâmetro extra `globalTagName?: string`
- Detecta se planilha tem coluna de tag (aliases: `tag`, `tags`, `etiqueta`, `etiquetas`)
- Por linha:
  1. Faz parse das tags da coluna (split por vírgula + trim)
  2. Adiciona `globalTagName` à lista se informado
  3. Para cada tag: `findOrCreate` por nome dentro da empresa
  4. Salva o contato (create ou update)
  5. Associa as tags via `contact_tags`

### `contacts.module.ts`
- Já inclui `Tag` no `TypeOrmModule.forFeature` ✅

---

## Frontend — alterações necessárias

### `contacts/page.tsx`
- Substituir abertura direta do file picker por um **modal** com:
  - Input de arquivo
  - Campo de tag global (busca + criação inline, similar ao `TagSelector`)
  - Botão "Importar"
- Passar `globalTagName` junto com o arquivo no FormData
