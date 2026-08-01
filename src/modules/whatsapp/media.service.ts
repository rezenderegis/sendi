import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId: configService.get<string>('BUCKET_CHAVE_ACESSO_S33'),
        secretAccessKey: configService.get<string>('BUCKET_CHAVE_S33'),
      },
    });
    this.bucket = configService.get<string>('BUCKET_23');
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    this.logger.log(`Upload concluído: ${key}`);
  }

  async getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
