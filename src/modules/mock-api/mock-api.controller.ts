import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MockApiService } from './mock-api.service';

/**
 * Endpoints fake pra usar como Bot Tools em testes/demos — nunca registrado em produção
 * (ver import condicional em app.module.ts). Sem guard de autenticação de propósito: simula
 * uma API de terceiro de verdade, que o ExternalActionsService chama via axios simples.
 */
@ApiTags('Mock API (teste/demo)')
@Controller('mock')
export class MockApiController {
  constructor(private readonly mockApiService: MockApiService) {}

  @Get('cliente/:cpf')
  @ApiOperation({ summary: '[MOCK] Consulta cliente por CPF' })
  cliente(@Param('cpf') cpf: string) {
    return this.mockApiService.cliente(cpf);
  }

  @Get('parcelas/:cpf')
  @ApiOperation({ summary: '[MOCK] Parcelas em atraso por CPF' })
  parcelas(@Param('cpf') cpf: string) {
    return this.mockApiService.parcelas(cpf);
  }

  @Get('cidades')
  @ApiOperation({ summary: '[MOCK] Lista de cidades atendidas' })
  cidades(@Query('uf') uf?: string) {
    return this.mockApiService.cidades(uf);
  }

  @Get('boleto/:cpf/:parcela')
  @ApiOperation({ summary: '[MOCK] Gera 2ª via de boleto' })
  boleto(@Param('cpf') cpf: string, @Param('parcela') parcela: string) {
    return this.mockApiService.boleto(cpf, parcela);
  }

  @Get('negociacao/:cpf')
  @ApiOperation({ summary: '[MOCK] Simula negociação/desconto' })
  negociacao(@Param('cpf') cpf: string, @Query('valor') valor?: string) {
    return this.mockApiService.negociacao(cpf, Number(valor) || 100);
  }

  @Get('cep/:cep')
  @ApiOperation({ summary: '[MOCK] Consulta endereço por CEP' })
  cep(@Param('cep') cep: string) {
    return this.mockApiService.cep(cep);
  }

  @Get('horarios')
  @ApiOperation({ summary: '[MOCK] Horários disponíveis pra atendimento' })
  horarios() {
    return this.mockApiService.horarios();
  }
}
