import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { ExternalActionsService } from '../external-actions/external-actions.service';
import { FlowsService } from '../flow-steps/flows.service';
import { FlowStepsService } from '../flow-steps/flow-steps.service';
import { FlowEngineService, FlowMessageSink } from '../flow-steps/flow-engine.service';
import { FlowStepOption } from '../flow-steps/flow-step.entity';
import {
  SchedulingFlowService,
  SchedulingState,
  SchedulingStepResult,
  SCHEDULING_TOOL_NAME,
  SCHEDULING_TOOL_DESCRIPTION,
} from '../scheduling/scheduling-flow.service';

function renderSchedulingReply(result: SchedulingStepResult): string {
  if (!result.options.length) return result.bodyText;
  return `${result.bodyText}\n${result.options.map((o) => `- ${o.label}`).join('\n')}`;
}

class ChatMessage {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class TestChatDto {
  @IsString()
  promptContent: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  history: ChatMessage[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  enabledToolNames?: string[] | null;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  enabledFlowNames?: string[] | null;

  // Quando presente, o teste está no meio do fluxo fixo de agendamento
  // (serviço -> dia -> horário) — a última mensagem do history é tratada
  // como resposta a essa etapa, sem passar pela IA.
  @IsOptional()
  schedulingState?: SchedulingState | null;
}

class RecordingSink implements FlowMessageSink {
  transcript: string[] = [];

  async sendText(text: string): Promise<void> {
    this.transcript.push(text);
  }

  async sendChoice(questionText: string, options: FlowStepOption[]): Promise<void> {
    this.transcript.push(`${questionText}\n${options.map((o) => `- ${o.label}`).join('\n')}`);
  }

  async sendImage(imageUrl: string, caption?: string): Promise<void> {
    this.transcript.push(`[Imagem: ${imageUrl}]${caption ? ` ${caption}` : ''}`);
  }
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly externalActionsService: ExternalActionsService,
    private readonly flowsService: FlowsService,
    private readonly flowStepsService: FlowStepsService,
    private readonly flowEngine: FlowEngineService,
    private readonly schedulingFlowService: SchedulingFlowService,
  ) {}

  @Post('test-chat')
  @ApiOperation({ summary: 'Testar prompt de IA com uma mensagem — executa tools e fluxos de verdade' })
  async testChat(@CurrentUser('companyId') companyId: string, @Body() dto: TestChatDto) {
    const contactName = dto.contactName || 'Visitante';
    const toolCalls: { name: string; args: any; result: any }[] = [];

    // Continuação do fluxo fixo de agendamento: a etapa é 100% determinística
    // (igual no WhatsApp real), então nem chama a IA — só casa a última
    // resposta do simulador contra a lista da etapa atual. isSimulated=true
    // garante que nenhum agendamento de teste é gravado no banco.
    if (dto.schedulingState) {
      const lastMessage = dto.history[dto.history.length - 1]?.content ?? '';
      const result = await this.schedulingFlowService.advance(companyId, dto.schedulingState, lastMessage, null, null, true);
      return { reply: renderSchedulingReply(result), toolCalls: [], schedulingState: result.nextState };
    }

    const allActions = await this.externalActionsService.findActive(companyId);
    const actions = dto.enabledToolNames?.length ? allActions.filter((a) => dto.enabledToolNames!.includes(a.name)) : allActions;
    const tools = actions.map((a) => ({ name: a.name, description: a.description, parameters: a.parametersSchema }));

    const allFlows = await this.flowsService.findAll(companyId);
    const availableFlows = dto.enabledFlowNames?.length ? allFlows.filter((f) => dto.enabledFlowNames!.includes(f.name)) : allFlows;
    if (availableFlows.length) {
      tools.push({
        name: 'iniciar_fluxo',
        description: `Inicia um fluxo guiado de perguntas fixas. Fluxos disponíveis:\n${availableFlows.map((f) => `- ${f.name}: ${f.description}`).join('\n')}`,
        parameters: {
          type: 'object',
          properties: { nome: { type: 'string', enum: availableFlows.map((f) => f.name) } },
          required: ['nome'],
        },
      });
    }

    const schedulingAllowed = !dto.enabledToolNames?.length || dto.enabledToolNames.includes(SCHEDULING_TOOL_NAME);
    const activeServices = await this.schedulingFlowService.findActiveServices(companyId);
    if (activeServices.length > 0 && schedulingAllowed) {
      tools.push({
        name: SCHEDULING_TOOL_NAME,
        description: SCHEDULING_TOOL_DESCRIPTION,
        parameters: { type: 'object', properties: {} },
      });
    }

    // Contato/conversa sintéticos — só existem pra resolver {{placeholders}}; ações que
    // gravariam num contato/conversa real (tag, atualizar contato, transferir, encerrar) são
    // puladas pelo FlowEngineService quando isSimulated é true (ver flow-engine.service.ts).
    const fakeContact = { id: '', companyId, name: contactName, metadata: {} } as any;
    const fakeConversation = { id: '', variables: null } as any;

    // Capturado pela tool iniciar_agendamento (se chamada) e devolvido na
    // resposta — o front do simulador reenvia esse estado na próxima chamada
    // pra continuar o fluxo fixo (ver dto.schedulingState acima).
    let nextSchedulingState: SchedulingState | null = null;
    // A lista de opções precisa chegar EXATAMENTE como calculada (pro teste
    // bater com o que o WhatsApp real mandaria) — não dá pra confiar na IA
    // reescrever isso na resposta final dela, então sobrescreve o reply.
    let schedulingReplyOverride: string | null = null;

    const executeTool = async (name: string, args: any) => {
      let result: any;
      try {
        if (name === SCHEDULING_TOOL_NAME) {
          const stepResult = await this.schedulingFlowService.start(companyId);
          nextSchedulingState = stepResult.nextState;
          schedulingReplyOverride = renderSchedulingReply(stepResult);
          result = { success: true, result: schedulingReplyOverride };
        } else if (name === 'iniciar_fluxo') {
          const flow = availableFlows.find((f) => f.name === args.nome);
          if (!flow?.startStepId) {
            result = { success: false, result: 'fluxo não encontrado ou sem passo inicial definido' };
          } else {
            const step = await this.flowStepsService.findById(companyId, flow.startStepId);
            if (!step) {
              result = { success: false, result: 'passo inicial não encontrado' };
            } else {
              const sink = new RecordingSink();
              await this.flowEngine.enterFlowStep(companyId, fakeContact, fakeConversation, sink, step, true);
              result = { success: true, result: sink.transcript.join('\n\n') || 'fluxo iniciado' };
            }
          }
        } else {
          const action = actions.find((a) => a.name === name);
          if (!action) {
            result = { success: false, result: 'ação não encontrada' };
          } else {
            const outcome = await this.externalActionsService.execute(action, args, this.flowEngine.buildToolContext(fakeContact, fakeConversation));
            result = { success: outcome.success, result: outcome.responseData ?? outcome.error };
          }
        }
      } catch (err: any) {
        result = { success: false, result: `erro ao executar: ${err.message}` };
      }

      toolCalls.push({ name, args, result: result.result });
      return result;
    };

    const reply = await this.aiService.chat(contactName, dto.history, dto.promptContent, tools.length ? { tools, executeTool } : undefined);
    return { reply: schedulingReplyOverride ?? reply, toolCalls, schedulingState: nextSchedulingState };
  }
}
