import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

function getKey(configService: ConfigService): Buffer {
  return Buffer.from(configService.get<string>('ENCRYPTION_KEY').padEnd(32).slice(0, 32));
}

export function encrypt(text: string, configService: ConfigService): string {
  const key = getKey(configService);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(encrypted: string, configService: ConfigService): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const key = getKey(configService);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
