# Tagging Automático por Contexto

## Objetivo
Aplicar tags automaticamente nas conversas com base no contexto identificado pelo LLM, sem intervenção manual do atendente.

## Tags previstas
| Tag | Quando usar |
|---|---|
| `COMERCIAL` | Prospect com interesse em contratar, pedindo orçamento ou informações sobre serviços |
| `SUPORTE` | Cliente existente com problema técnico, dúvida sobre projeto em andamento |
| `FINANCEIRO` | Questões relacionadas a pagamento, fatura, contrato ou renovação |

## Como vai funcionar

### 1. Instrução no prompt
O system prompt instrui o LLM a terminar toda resposta com exatamente uma das tags entre colchetes: `[COMERCIAL]`, `[SUPORTE]` ou `[FINANCEIRO]`.

### 2. Processamento no backend
O processor (`whatsapp.processor.ts`) aplica um regex no final da resposta do LLM:
- Extrai o marcador `[TAG]`
- Remove o marcador da mensagem antes de enviar ao cliente
- Busca a tag pelo nome na empresa (`TagsService.findByName`)
- Se encontrar, aplica na conversa via `ConversationsService.addTag`
- Se não encontrar, ignora silenciosamente (não cria tag nova)

### 3. Pré-requisito
As 3 tags precisam estar cadastradas previamente no banco para a empresa. O sistema não cria tags automaticamente.

## Exemplo de fluxo

**Resposta do LLM (interna):**
> "Entendi, podemos ajudar com sua integração. Quer agendar uma conversa com nosso time? [COMERCIAL]"

**Mensagem enviada ao cliente:**
> "Entendi, podemos ajudar com sua integração. Quer agendar uma conversa com nosso time?"

**Tag aplicada na conversa:** `COMERCIAL`

## O que precisa ser implementado

- [ ] Instrução no `DEFAULT_SYSTEM_PROMPT` (e orientação para quem configurar prompt customizado)
- [ ] Regex no processor para extrair `[TAG]` do final da resposta
- [ ] Método `findByName(name, companyId)` no `TagsService`
- [ ] Chamada a `conversationsService.addTag()` com o id encontrado
- [ ] A tag deve ser re-aplicada a cada mensagem (contexto pode mudar ao longo da conversa)

## Arquivos que serão modificados
- `src/modules/ai/ai.service.ts` — instrução no prompt
- `src/modules/whatsapp/whatsapp.processor.ts` — extração e aplicação da tag
- `src/modules/tags/tags.service.ts` — novo método `findByName`
