import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'chat_events' })
@Index('idx_chat_events_observed_at', ['observedAt'])
@Index('idx_chat_events_author_name', ['authorName'])
@Index('idx_chat_events_content', ['content'])
export class ChatEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', name: 'batch_id' })
  batchId!: number;

  @Column({ type: 'datetime', name: 'observed_at' })
  observedAt!: Date;

  @Column({ type: 'varchar', name: 'author_name' })
  authorName!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
