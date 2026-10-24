import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DeviceToken, DevicePlatform } from './device-token.entity';
import { UsersService } from '../users/users.service';
import { firebaseConfig } from '../../config/firebase.config';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private initialized = false;

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    if (!firebaseConfig.serviceAccountJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON não configurado — push notifications desativadas');
      return;
    }
    try {
      const serviceAccount = JSON.parse(firebaseConfig.serviceAccountJson);
      initializeApp({ credential: cert(serviceAccount) });
      this.initialized = true;
    } catch (error) {
      this.logger.error(`Falha ao inicializar Firebase Admin: ${error.message}`);
    }
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
    soundEnabled = true,
  ): Promise<void> {
    // Upsert por token (não por usuário) — se o mesmo aparelho trocar de
    // conta logada, o token passa a apontar pro usuário novo.
    const existing = await this.deviceTokenRepo.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.soundEnabled = soundEnabled;
      await this.deviceTokenRepo.save(existing);
      return;
    }
    await this.deviceTokenRepo.save(this.deviceTokenRepo.create({ userId, token, platform, soundEnabled }));
  }

  async unregisterDeviceToken(token: string): Promise<void> {
    await this.deviceTokenRepo.delete({ token });
  }

  // Notifica quem deve saber que chegou mensagem nova: o atendente
  // responsável, ou — se a conversa ainda não foi assumida por ninguém —
  // os membros do departamento dela (fallbackUserIds), ou se não tem
  // departamento também, todo mundo da empresa, pra alguém pegar.
  async notifyNewMessage(params: {
    companyId: string;
    conversationId: string;
    assignedUserId: string | null;
    fallbackUserIds?: string[] | null;
    contactName: string;
    messageContent: string;
  }): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('Push ignorado: Firebase Admin não inicializado (FIREBASE_SERVICE_ACCOUNT_JSON ausente)');
      return;
    }

    const targetUserIds = params.assignedUserId
      ? [params.assignedUserId]
      : params.fallbackUserIds ?? (await this.usersService.findAll(params.companyId)).map((u) => u.id);

    if (targetUserIds.length === 0) return;

    const tokens = await this.deviceTokenRepo.find({ where: { userId: In(targetUserIds) } });
    if (tokens.length === 0) {
      this.logger.debug(`Push ignorado: nenhum device token cadastrado pra userIds=[${targetUserIds.join(', ')}]`);
      return;
    }

    const preview =
      params.messageContent.length > 100 ? `${params.messageContent.slice(0, 100)}…` : params.messageContent;

    // Dois grupos (com/sem som) em vez de um payload único — o som é
    // decidido pelo sistema operacional a partir do payload, não dá pra
    // controlar em runtime no app quando ele está em segundo plano/fechado.
    const withSound = tokens.filter((t) => t.soundEnabled);
    const silent = tokens.filter((t) => !t.soundEnabled);

    await Promise.all([
      this.sendToGroup(withSound, params.contactName, preview, params.conversationId, true),
      this.sendToGroup(silent, params.contactName, preview, params.conversationId, false),
    ]);
  }

  private async sendToGroup(
    tokens: DeviceToken[],
    title: string,
    body: string,
    conversationId: string,
    withSound: boolean,
  ): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const res = await getMessaging().sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: { title, body },
        data: { type: 'new_message', conversationId },
        apns: {
          payload: { aps: withSound ? { sound: 'default' } : {} },
        },
        android: {
          priority: 'high',
          notification: { channelId: withSound ? 'messages' : 'messages_silent' },
        },
      });

      // Loga o motivo de cada falha — sem isso só sabemos "0/1 ok" e não o
      // porquê (token inválido, credencial APNs errada, etc).
      res.responses.forEach((r, i) => {
        if (!r.success) {
          this.logger.warn(`Token ${tokens[i].token.slice(0, 12)}... falhou: ${r.error?.code} — ${r.error?.message}`);
        }
      });

      // Remove tokens que o dispositivo não reconhece mais (app desinstalado,
      // reinstalado, etc) — sem isso a lista só cresce com lixo morto.
      const staleTokens = res.responses
        .map((r, i) => (!r.success && this.isUnregisteredError(r.error?.code) ? tokens[i].token : null))
        .filter((t): t is string => t !== null);
      if (staleTokens.length > 0) {
        await this.deviceTokenRepo.delete({ token: In(staleTokens) });
      }

      this.logger.debug(`Push enviado (${withSound ? 'com' : 'sem'} som): ${res.successCount}/${tokens.length} ok`);
    } catch (error) {
      this.logger.warn(`Falha ao enviar push: ${error.message}`);
    }
  }

  private isUnregisteredError(code?: string): boolean {
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
  }
}
