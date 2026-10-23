import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

// Um token por linha, não por usuário — se a pessoa trocar de conta no mesmo
// aparelho, o registro é reatribuído (upsert por token), nunca duplicado.
@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  @Column({ default: true })
  soundEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
