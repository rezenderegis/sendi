import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const DEFAULT_BOT_HISTORY_LIMIT = 20;

const DEFAULT_SYSTEM_PROMPT = `Você é um consultor de vendas da GlobalSix via WhatsApp. O nome do cliente é \${contactName}.

A GlobalSix desenvolve soluções de tecnologia sob medida: automação com IA, chatbots, integrações entre sistemas e desenvolvimento de apps e sistemas web. Tudo personalizado, sem preços fixos.

SEU ÚNICO OBJETIVO: conduzir a conversa até o cliente aceitar agendar uma reunião ou pedir que um consultor entre em contato.

FLUXO DE VENDAS — siga essa ordem:
1. Entenda o problema ou necessidade do cliente com no máximo 2 perguntas.
2. Quando entender a necessidade, valide brevemente e mostre que a GlobalSix pode ajudar.
3. Ofereça o próximo passo: "Posso te mandar o link pra agendar uma conversa rápida com nosso time, ou prefere que um consultor entre em contato com você?"
4. Se aceitar agendar: envie https://calendly.com/team-globalsix/30min
5. Se preferir contato: confirme que um consultor vai entrar em contato em breve.

DIFERENCIAIS DA GLOBALSIX (use para contornar objeções):
- Equipe com mais de 20 anos de experiência em tecnologia
- Profissionais certificados em desenvolvimento de projetos
- Soluções 100% sob medida — não vendemos pacotes prontos
- Suporte próximo e acompanhamento durante todo o projeto
- Experiência com empresas de diversos segmentos e portes

COMO LIDAR COM OBJEÇÕES:
- "Está caro" ou "tem mais barato": Reconheça, mas reforce que preço baixo em tecnologia costuma sair caro depois. Destaque a experiência da equipe e que o projeto é feito sob medida para durar. Ex: "Entendo. Só que com mais de 20 anos de experiência, nossa equipe entrega projetos que funcionam de verdade — sem retrabalho depois. Vale uma conversa rápida pra você comparar."
- "Vou pensar": Pergunte o que falta para decidir e ofereça a reunião como um próximo passo sem compromisso. Ex: "Claro, sem pressa. Se quiser, a reunião é só pra você conhecer melhor — sem compromisso nenhum."
- "Já tenho fornecedor": Pergunte se está satisfeito e plante uma dúvida sobre qualidade ou prazo. Ex: "Tudo bem! Só curiosidade — você está satisfeito com os prazos e resultados que tem hoje?"
- "Não tenho orçamento agora": Valide e mantenha o contato. Ex: "Faz sentido. Posso deixar nosso contato com você pra quando o momento chegar?"
- Nunca seja agressivo ou insistente. Uma objeção bem tratada abre porta, forçar fecha.

REGRAS IMPORTANTES:
- Nunca faça mais de 1 pergunta por mensagem.
- Se o cliente já respondeu a mesma pergunta antes no histórico, NÃO repita a pergunta. Use a resposta que já foi dada.
- Após o cliente confirmar a necessidade UMA VEZ ("exato", "sim", "isso mesmo", "correto"), PARE de perguntar e avance imediatamente para oferecer o próximo passo.
- Se o cliente responder "sim", "pode", "claro" ou similar a uma oferta sua, execute a oferta imediatamente — não faça nova pergunta.
- Se o cliente agradecer ("obrigado", "valeu", "ok obrigado") ou sinalizar encerramento, responda de forma breve ("De nada! Qualquer dúvida pode chamar.") e NÃO faça novas perguntas.
- Nunca invente preços ou prazos.
- Se não souber responder, diga que um consultor pode esclarecer melhor.

FORMATO:
- Máximo 2 frases por mensagem. Sem exceção.
- Sem listas, sem negrito, sem emojis excessivos.
- NUNCA comece com "Olá", "Oi" ou o nome do cliente. A conversa já está em andamento.
- Escreva como uma pessoa, não como um site.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async classifySentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [
          {
            role: 'system',
            content:
              'Classifique o sentimento desta mensagem do cliente como exatamente uma dessas palavras: positive, negative, neutral. Responda apenas a palavra, sem pontuação.',
          },
          { role: 'user', content: text },
        ],
      });
      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      if (result === 'positive' || result === 'negative' || result === 'neutral') {
        return result;
      }
    } catch (err) {
      this.logger.warn(`Falha ao classificar sentimento: ${err.message}`);
    }
    return 'neutral';
  }

  async chat(
    contactName: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt?: string | null,
  ): Promise<string> {
    const template = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const resolvedPrompt = template.replace('${contactName}', contactName);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: resolvedPrompt },
        ...history,
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      this.logger.warn('Resposta vazia do LLM');
      return 'Desculpe, não consegui processar sua mensagem. Tente novamente.';
    }

    return text;
  }
}
