# Normalização de Número de Telefone (9º Dígito)

## Problema

O WhatsApp Business API apresenta uma assimetria para números brasileiros:

- **Ao enviar:** a API da Meta exige o 9º dígito após o DDD (13 dígitos: `55` + DDD + `9` + 8 dígitos)
- **Ao receber (webhook):** a Meta pode entregar o número sem o 9º dígito (12 dígitos: `55` + DDD + 8 dígitos), dependendo de como o número está registrado na conta WhatsApp do usuário

### Consequência sem normalização
O `findOrCreateByPhone` fazia busca exata. Se o contato estava salvo como `5561983115333` (com 9) e o webhook entregava `556183115333` (sem 9), o sistema criava um segundo contato duplicado, desvinculado do original e sem nenhum contexto de campanha.

---

## Solução

### Utilitário compartilhado

**Arquivo:** `src/common/utils/phone.util.ts`

```typescript
// Normaliza para o formato com 9º dígito (13 dígitos para Brasil)
normalizePhone(raw: string): string

// Retorna o formato alternativo (com ↔ sem 9) para lookup de fallback
phoneAlternative(phone: string): string | null
```

**Regra de normalização:** se o número começa com `55` e tem 12 dígitos, insere `9` na posição 4 (após o DDD).

### Onde é aplicado

| Ponto | Comportamento |
|---|---|
| `findOrCreateByPhone` | Normaliza antes de buscar. Se não achar, tenta o formato alternativo. Se achar pelo alternativo, migra o registro para o formato normalizado. |
| `create` (contato manual) | Normaliza o telefone ao criar |
| `importFromFile` (CSV/XLSX) | Normaliza + tenta alternativo ao fazer upsert |
| `sendMessage` (WhatsApp service) | Normaliza `dto.to` antes de enviar e de vincular ao contato |

### Migração automática de contatos existentes

Contatos criados antes da normalização (com formato sem 9) são migrados automaticamente na primeira vez que o contato envia uma mensagem: `findOrCreateByPhone` encontra pelo fallback e salva com o formato normalizado.

---

## Exemplo

```
Webhook entrega: 556183115333  (12 dígitos, sem 9)
normalizePhone   → 5561983115333 (13 dígitos, com 9)

Contato no banco: 5561983115333
→ busca exata: encontrado ✓

Contato no banco: 556183115333 (formato antigo)
→ busca exata: não encontrado
→ phoneAlternative: 5561983115333
→ busca alternativa: encontrado ✓ → migra phone para 5561983115333
```

---

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `common/utils/phone.util.ts` | novo utilitário (`normalizePhone`, `phoneAlternative`) |
| `contacts/contacts.service.ts` | normalização em `findOrCreateByPhone`, `create`, `importFromFile` |
| `whatsapp/whatsapp.service.ts` | normalização do `dto.to` em `sendMessage` |
