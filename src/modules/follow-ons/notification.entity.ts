import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class AppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  body: string | null;

  @Column({ nullable: true })
  conversationId: string | null;

  @Column({ nullable: true })
  followOnId: string | null;

  @Column({ nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
