# Backlog — Sendi

## Legenda
- 🔴 Alta prioridade
- 🟡 Média prioridade
- 🟢 Baixa prioridade
- ✅ Implementado

---

## Bot IA

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| ✅ | — | Resposta automática via LLM | GPT-4o-mini, histórico de contexto |
| ✅ | — | Perguntar nome na primeira mensagem | `aiState = 'waiting_name'` |
| ✅ | — | Pausar bot quando cliente pede humano | `aiState = 'human_requested'` |
| ✅ | — | Pausar bot quando cliente pede suporte | Detecção por keywords |
| ✅ | — | Reativar bot pelo painel | `POST /conversations/:id/bot/enable` |
| ✅ | — | Prompt configurável por número | `PATCH /whatsapp/numbers/:id` |
| ✅ | — | Limite de histórico configurável | `botHistoryLimit` por número |
| 🔴 | Alta | Tagging automático por contexto | Ver [tagging-automatico.md](features/tagging-automatico.md) |

---

## Usuários e Permissões

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| ✅ | — | Criar usuários na empresa | `POST /users` |
| ✅ | — | Roles: owner, admin, agent | Definidas no `UserRole` enum |
| 🔴 | Alta | Guard de role nas rotas sensíveis | Apenas owner/admin pode criar usuários |
| 🟡 | Média | Troca de senha pelo próprio usuário | Endpoint autenticado |
| 🟢 | Baixa | Reset de senha por email | Fluxo com token por email |

---

## Atendimento

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| ✅ | — | Listar conversas com paginação | Filtro por tag, status |
| ✅ | — | Enviar mensagem pelo painel | `POST /whatsapp/messages/send` |
| ✅ | — | Tags nas conversas | Adicionar, remover, filtrar |
| 🔴 | Alta | Nome do agente na mensagem | Campo `sentByUserId` na tabela `messages` |
| 🟡 | Média | Atribuição de conversa a agente | `assignedUserId` já existe, falta UX |

---

## Broadcast — Envio em Massa

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| 🔴 | Alta | Fase 1 — Broadcast manual | Ver [broadcast.md](features/broadcast.md) |
| 🟡 | Média | Fase 2 — Automações por regra | Ver [broadcast.md](features/broadcast.md) |

---

## Contatos

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| ✅ | — | Criar e editar contatos | Nome, email, empresa, notas, externalId |
| ✅ | — | Capturar nome do perfil WhatsApp | `whatsappName` salvo automaticamente |
| ✅ | — | Importar contatos via CSV/XLSX | `POST /contacts/import` — upsert por telefone |

---

## Infraestrutura

| Status | Prioridade | Feature | Detalhes |
|---|---|---|---|
| ✅ | — | Deploy em produção (AWS EC2) | Docker Compose |
| 🟡 | Média | Migrations automáticas em produção | Hoje usa `synchronize: true` em dev |
| 🟢 | Baixa | CI/CD automatizado | Deploy automático no push para main |
