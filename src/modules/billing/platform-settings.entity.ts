import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Tabela singleton: sempre existe no máximo uma linha (a service garante isso).
@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Fallback: usado quando a mensagem é um template mas não achamos a categoria dele sincronizada.
  @Column({ type: 'int', default: 0 })
  costPerOutboundMessageCents: number;

  @Column({ type: 'int', default: 0 })
  costPerBotMessageCents: number;

  // Mensagem de texto livre (não-template) enviada pelo agente — normalmente grátis na Meta.
  @Column({ type: 'int', default: 0 })
  costPerFreeTextMessageCents: number;

  @Column({ type: 'int', default: 0 })
  costPerMarketingMessageCents: number;

  @Column({ type: 'int', default: 0 })
  costPerUtilityMessageCents: number;

  @Column({ type: 'int', default: 0 })
  costPerAuthenticationMessageCents: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
