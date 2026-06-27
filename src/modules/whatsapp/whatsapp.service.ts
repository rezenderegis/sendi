import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { WhatsappNumber } from './whatsapp-number.entity';
import { ConnectNumberDto, SendMessageDto } from './dto/send-message.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { ContactsService } from '../contacts/contacts.service';
import { MessageDirection, MessageStatus, MessageType } from '../conversations/message.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappNumber)
    private readonly whatsappNumberRepository: Repository<WhatsappNumber>,
    private readonly configService: ConfigService,
    private readonly conversationsService: ConversationsService,
    private readonly contactsService: ContactsService,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
  ) {}

  private encrypt(text: string): string {
    const key = Buffer.from(
      this.configService.get<string>('ENCRYPTION_KEY').padEnd(32).slice(0, 32),
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const key = Buffer.from(
      this.configService.get<string>('ENCRYPTION_KEY').padEnd(32).slice(0, 32),
    );
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  async connectNumber(companyId: string, dto: ConnectNumberDto): Promise<WhatsappNumber> {
    const encryptedToken = this.encrypt(dto.accessToken);
    const verifyToken = crypto.randomBytes(16).toString('hex');

    const number = this.whatsappNumberRepository.create({
      companyId,
      phoneNumberId: dto.phoneNumberId,
      wabaId: dto.wabaId,
      accessToken: encryptedToken,
      phoneNumber: dto.phoneNumber,
      displayName: dto.displayName,
      webhookVerifyToken: verifyToken,
    });

    return this.whatsappNumberRepository.save(number);
  }

  async findAll(companyId: string): Promise<WhatsappNumber[]> {
    return this.whatsappNumberRepository.find({
      where: { companyId, isActive: true },
    });
  }

  async findById(id: string, companyId: string): Promise<WhatsappNumber> {
    const number = await this.whatsappNumberRepository
      .createQueryBuilder('n')
      .addSelect('n.accessToken')
      .where('n.id = :id AND n.companyId = :companyId', { id, companyId })
      .getOne();
    if (!number) {
      throw new NotFoundException('Número WhatsApp não encontrado');
    }
    return number;
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<WhatsappNumber | null> {
    return this.whatsappNumberRepository
      .createQueryBuilder('n')
      .addSelect('n.accessToken')
      .where('n.phoneNumberId = :phoneNumberId AND n.isActive = true', { phoneNumberId })
      .getOne();
  }

  async remove(id: string, companyId: string): Promise<void> {
    const number = await this.findById(id, companyId);
    number.isActive = false;
    await this.whatsappNumberRepository.save(number);
  }

  async sendMessage(companyId: string, dto: SendMessageDto): Promise<any> {
    const whatsappNumber = await this.findById(dto.whatsappNumberId, companyId);
    const accessToken = this.decrypt(whatsappNumber.accessToken);
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');

    const isTemplate = dto.type === 'template';

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: dto.to,
    };

    if (isTemplate) {
      body.type = 'template';
      body.template = {
        name: dto.templateName,
        language: { code: dto.templateLanguage || 'pt_BR' },
      };
    } else {
      body.type = 'text';
      body.text = { body: dto.message };
    }

    const response = await axios.post(
      `${apiUrl}/${whatsappNumber.phoneNumberId}/messages`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const whatsappMessageId = response.data?.messages?.[0]?.id;

    const contact = await this.contactsService.findOrCreateByPhone(
      dto.to,
      companyId,
    );

    const conversation = await this.conversationsService.findOrCreate(
      companyId,
      contact.id,
      whatsappNumber.id,
    );

    const message = await this.conversationsService.saveMessage({
      conversationId: conversation.id,
      companyId,
      direction: MessageDirection.OUTBOUND,
      type: isTemplate ? MessageType.TEMPLATE : MessageType.TEXT,
      content: isTemplate ? `template:${dto.templateName}` : dto.message,
      whatsappMessageId,
      status: MessageStatus.SENT,
    });

    return { message, whatsappMessageId };
  }

  async sendTestMessage(id: string, companyId: string): Promise<any> {
    const whatsappNumber = await this.findById(id, companyId);
    const accessToken = this.decrypt(whatsappNumber.accessToken);
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');

    const response = await axios.post(
      `${apiUrl}/${whatsappNumber.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: whatsappNumber.phoneNumber,
        type: 'text',
        text: { body: 'Sendi: Número conectado com sucesso! ✅' },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return { success: true, data: response.data };
  }

  async processInboundMessage(payload: any): Promise<void> {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return;

    const phoneNumberId = value.metadata?.phone_number_id;
    const whatsappNumber = await this.findByPhoneNumberId(phoneNumberId);

    if (!whatsappNumber) {
      this.logger.warn(`Phone number ID não encontrado: ${phoneNumberId}`);
      return;
    }

    const messages = value.messages || [];
    const statuses = value.statuses || [];

    for (const msg of messages) {
      await this.whatsappQueue.add(
        'inbound-message',
        {
          message: msg,
          whatsappNumber,
          companyId: whatsappNumber.companyId,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    }

    for (const status of statuses) {
      await this.whatsappQueue.add(
        'status-update',
        { status },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    }
  }
}
