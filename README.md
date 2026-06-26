# Sendi — WhatsApp SaaS API

API multiempresa para envio e recebimento de mensagens via WhatsApp Business API oficial da Meta.

## Stack

- **NestJS** + TypeScript
- **PostgreSQL** (TypeORM)
- **Redis** + BullMQ (filas)
- **Docker** + Docker Compose
- **Nginx** (proxy reverso)
- **Certbot** / Let's Encrypt (SSL)
- **Passport JWT** (autenticação)

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Conta na Meta for Developers com WhatsApp Business API ativa
- (Produção) Domínio apontando para o servidor EC2

---

## Rodando em desenvolvimento

```bash
# 1. Clone e configure variáveis
cp .env.example .env
# Edite o .env com seus valores

# 2. Suba os containers
docker compose up --build

# A API estará em: http://localhost:3000
# Swagger: http://localhost:3000/api/docs
# Health: http://localhost:3000/health
```

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `NODE_ENV` | Ambiente | `development` |
| `PORT` | Porta da aplicação | `3000` |
| `DATABASE_HOST` | Host do PostgreSQL | `db` |
| `DATABASE_PORT` | Porta do PostgreSQL | `5432` |
| `DATABASE_USER` | Usuário do banco | `postgres` |
| `DATABASE_PASSWORD` | Senha do banco | `senha_aqui` |
| `DATABASE_NAME` | Nome do banco | `sendi` |
| `REDIS_HOST` | Host do Redis | `redis` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `JWT_SECRET` | Segredo do JWT (mín. 32 chars) | `seu_secret_aqui` |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook | `seu_token` |
| `WHATSAPP_API_URL` | URL base da API da Meta | `https://graph.facebook.com/v18.0` |
| `ENCRYPTION_KEY` | Chave AES-256 (exatamente 32 chars) | `chave_de_32_caracteres_aqui!!!!` |

---

## Configurar Webhook na Meta

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Selecione seu app → WhatsApp → Configurações
3. Em "Webhook", clique em **Editar**
4. Configure:
   - **URL do callback**: `https://SEU_DOMINIO/webhook/whatsapp`
   - **Token de verificação**: valor do `WHATSAPP_VERIFY_TOKEN` no seu `.env`
5. Assine o campo **messages**

---

## Endpoints

### Auth
```
POST /api/v1/auth/register   → Criar empresa + usuário owner
POST /api/v1/auth/login      → Login (retorna JWT)
GET  /api/v1/auth/me         → Dados do usuário logado
```

### Companies
```
GET   /api/v1/companies/me   → Dados da empresa
PATCH /api/v1/companies/me   → Atualizar empresa
```

### Users
```
GET    /api/v1/users         → Listar usuários da empresa
POST   /api/v1/users         → Criar usuário
PATCH  /api/v1/users/:id     → Atualizar usuário
DELETE /api/v1/users/:id     → Remover usuário
```

### WhatsApp Numbers
```
POST   /api/v1/whatsapp/numbers           → Conectar número
GET    /api/v1/whatsapp/numbers           → Listar números
DELETE /api/v1/whatsapp/numbers/:id       → Remover número
POST   /api/v1/whatsapp/numbers/:id/test  → Mensagem de teste
```

### Mensagens
```
POST /api/v1/whatsapp/messages/send
Body: { "to": "5561999999999", "message": "Olá!", "whatsappNumberId": "uuid" }
```

### Webhook (público)
```
GET  /webhook/whatsapp   → Verificação Meta
POST /webhook/whatsapp   → Receber mensagens/status
```

### Conversations
```
GET   /api/v1/conversations            → Listar (paginado: ?page=1&limit=20)
GET   /api/v1/conversations/:id        → Detalhes
GET   /api/v1/conversations/:id/messages → Mensagens (paginado)
PATCH /api/v1/conversations/:id        → Atualizar status
```

### Contacts
```
GET   /api/v1/contacts        → Listar contatos
POST  /api/v1/contacts        → Criar contato
PATCH /api/v1/contacts/:id    → Atualizar contato
```

---

## Deploy em Produção (EC2)

### 1. Configurar SSL
```bash
# No servidor EC2, após clonar o repositório:
./scripts/setup-ssl.sh SEU_DOMINIO SEU_EMAIL
```

### 2. Deploy
```bash
# Configurar .env com valores de produção
cp .env.example .env
nano .env

# Subir em produção
docker compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker compose -f docker-compose.prod.yml logs -f app
```

### 3. Atualizações
```bash
./scripts/deploy.sh
```

---

## Migrations (produção)

Em produção, o `synchronize` está desativado. Use migrations:

```bash
# Rodar migrations
docker compose -f docker-compose.prod.yml exec app npm run migration:run

# Reverter última migration
docker compose -f docker-compose.prod.yml exec app npm run migration:revert
```

---

## Segurança

- Senhas com **bcrypt** (salt 12)
- JWT com expiração de 7 dias
- Access tokens WhatsApp criptografados com **AES-256-CBC**
- Rate limiting: **100 req/min por IP**
- Validação total de DTOs com **class-validator**
- Multitenancy: todos os dados isolados por `companyId`

---

## Arquitetura de Filas (BullMQ)

Mensagens inbound são processadas de forma assíncrona:

```
Webhook POST → WhatsappService → Bull Queue "whatsapp"
                                      ↓
                              WhatsappProcessor
                                      ↓
                     ContactsService (find/create)
                     ConversationsService (find/create)
                     MessageRepository (save)
```

Isso garante que o webhook responda imediatamente com `200 OK` para a Meta, e o processamento acontece em background com retry automático (3 tentativas, backoff exponencial).
# sendi
