import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExternalAction } from './external-action.entity';
import { CreateExternalActionDto, TestExternalActionDto, UpdateExternalActionDto } from './dto/external-action.dto';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

export type ExternalActionWithFlag = ExternalAction & { hasAccessToken: boolean };

export interface ExecuteResult {
  success: boolean;
  responseData?: any;
  error?: string;
  latencyMs: number;
}

function renderTemplate(value: any, vars: Record<string, any>): any {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? String(vars[key]) : ''));
  }
  if (Array.isArray(value)) {
    return value.map((v) => renderTemplate(v, vars));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderTemplate(v, vars)]));
  }
  return value;
}

@Injectable()
export class ExternalActionsService {
  constructor(
    @InjectRepository(ExternalAction)
    private readonly repo: Repository<ExternalAction>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(companyId: string): Promise<ExternalActionWithFlag[]> {
    const { entities, raw } = await this.repo
      .createQueryBuilder('ea')
      .addSelect('ea.accessToken')
      .where('ea.companyId = :companyId', { companyId })
      .orderBy('ea.createdAt', 'DESC')
      .getRawAndEntities();

    return entities.map((entity, i) => {
      const hasAccessToken = !!raw[i]?.ea_accessToken;
      delete (entity as any).accessToken;
      return { ...entity, hasAccessToken };
    });
  }

  async findActive(companyId: string): Promise<ExternalAction[]> {
    return this.repo.find({ where: { companyId, isActive: true } });
  }

  async findById(id: string, companyId: string): Promise<ExternalActionWithFlag> {
    const { entities, raw } = await this.repo
      .createQueryBuilder('ea')
      .addSelect('ea.accessToken')
      .where('ea.id = :id AND ea.companyId = :companyId', { id, companyId })
      .getRawAndEntities();

    if (!entities.length) throw new NotFoundException('Ação não encontrada');
    const hasAccessToken = !!raw[0]?.ea_accessToken;
    delete (entities[0] as any).accessToken;
    return { ...entities[0], hasAccessToken };
  }

  async create(companyId: string, dto: CreateExternalActionDto): Promise<ExternalAction> {
    const accessToken = dto.accessToken ? encrypt(dto.accessToken, this.configService) : null;
    return this.repo.save(this.repo.create({ ...dto, companyId, accessToken }));
  }

  async update(id: string, companyId: string, dto: UpdateExternalActionDto): Promise<ExternalAction> {
    const action = await this.repo.findOne({ where: { id, companyId } });
    if (!action) throw new NotFoundException('Ação não encontrada');

    const { accessToken, ...rest } = dto;
    Object.assign(action, rest);
    if (accessToken !== undefined) {
      action.accessToken = accessToken ? encrypt(accessToken, this.configService) : null;
    }
    return this.repo.save(action);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const action = await this.repo.findOne({ where: { id, companyId } });
    if (!action) throw new NotFoundException('Ação não encontrada');
    await this.repo.remove(action);
  }

  async execute(
    action: Pick<ExternalAction, 'method' | 'url' | 'headersTemplate' | 'bodyTemplate' | 'accessToken' | 'timeoutMs'>,
    modelArgs: Record<string, any>,
    context: Record<string, any>,
  ): Promise<ExecuteResult> {
    const vars = { ...context, ...modelArgs };
    const headers = renderTemplate(action.headersTemplate ?? {}, vars);
    if (action.accessToken) {
      headers['Authorization'] = `Bearer ${decrypt(action.accessToken, this.configService)}`;
    }
    const url = renderTemplate(action.url, vars);
    const data = renderTemplate(action.bodyTemplate ?? {}, vars);

    const start = Date.now();
    try {
      const res = await axios.request({
        method: action.method,
        url,
        headers,
        ...(action.method === 'GET' ? { params: data } : { data }),
        timeout: action.timeoutMs ?? 8000,
      });
      return { success: true, responseData: res.data, latencyMs: Date.now() - start };
    } catch (err: any) {
      const error = err.response?.data?.message || err.response?.statusText || err.message || 'Erro desconhecido';
      return { success: false, error, latencyMs: Date.now() - start };
    }
  }

  async test(dto: TestExternalActionDto): Promise<ExecuteResult> {
    return this.execute(
      {
        method: dto.method,
        url: dto.url,
        headersTemplate: dto.headersTemplate ?? null,
        bodyTemplate: dto.bodyTemplate ?? null,
        accessToken: dto.accessToken ? encrypt(dto.accessToken, this.configService) : null,
        timeoutMs: dto.timeoutMs ?? 8000,
      },
      dto.sampleValues ?? {},
      {},
    );
  }
}
