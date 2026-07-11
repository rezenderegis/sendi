import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';

@Entity('prompt_versions')
export class PromptVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  promptId: string;

  @ManyToOne(() => CampaignPrompt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promptId' })
  prompt: CampaignPrompt;

  @Column()
  name: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  savedAt: Date;
}
