import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { AiService } from './ai.service';

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
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('test-chat')
  @ApiOperation({ summary: 'Testar prompt de IA com uma mensagem' })
  async testChat(@Body() dto: TestChatDto) {
    const reply = await this.aiService.chat(
      dto.contactName || 'Visitante',
      dto.history,
      dto.promptContent,
    );
    return { reply };
  }
}
