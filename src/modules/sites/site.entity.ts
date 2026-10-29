import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  companyId: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  // Domínio real que aponta pro site (DNS configurado manualmente no
  // Vercel) — só o admin da plataforma define, já que envolve configuração
  // fora do sistema.
  @Column({ nullable: true, unique: true })
  domain: string | null;

  // HTML completo colado pelo cliente — servido como está, sem parsing.
  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
