import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import axios from 'axios';
import { Message } from '../conversations/message.entity';
import { WhatsappService } from './whatsapp.service';
import { MediaService } from './media.service';

@Processor('media')
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly whatsappService: WhatsappService,
    private readonly mediaService: MediaService,
    private readonly configService: ConfigService,
  ) {}

  @Process('upload-media')
  async handleUploadMedia(job: Job<{ messageId: string; companyId: string }>) {
    const { messageId, companyId } = job.data;

    const message = await this.messageRepo.findOne({ where: { id: messageId, companyId } });
    if (!message) return;

    if (message.metadata?.s3Key) return;

    const raw = message.metadata?.raw;
    const mediaId =
      raw?.audio?.id || raw?.image?.id || raw?.video?.id || raw?.document?.id || raw?.sticker?.id;
    if (!mediaId) return;

    const whatsappNumber = await this.whatsappService.findById(message.whatsappNumberId, companyId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (this.whatsappService as any).decrypt(whatsappNumber.accessToken);
    const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');

    const metaRes = await axios.get(`${apiUrl}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { url, mime_type } = metaRes.data;

    const downloadRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(downloadRes.data);

    const MIME_TO_EXT: Record<string, string> = {
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/amr': 'amr',
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'video/3gpp': '3gp',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    };
    const ext = MIME_TO_EXT[mime_type] ?? mime_type?.split('/')?.[1]?.split(';')?.[0] ?? message.type;
    const now = new Date();
    const s3Key = `${companyId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${messageId}.${ext}`;

    await this.mediaService.upload(s3Key, buffer, mime_type);

    const filename = raw?.document?.filename ?? null;
    const extra = JSON.stringify({ s3Key, mimeType: mime_type, ...(filename ? { filename } : {}) });
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ metadata: () => `metadata || '${extra}'::jsonb` })
      .where('id = :id', { id: messageId })
      .execute();

    this.logger.log(`Mídia ${messageId} salva em S3: ${s3Key}`);
  }
}
