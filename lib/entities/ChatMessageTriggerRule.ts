import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'chat_message_trigger_rules' })
@Index('idx_chat_message_trigger_rules_active', ['isActive'])
export class ChatMessageTriggerRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'rule_name' })
  ruleName!: string;

  @Column({ type: 'varchar', name: 'keyword' })
  keyword!: string;

  @Column({ type: 'varchar', nullable: true, name: 'author_name' })
  authorName!: string | null;

  @Column({ type: 'text', name: 'response_text' })
  responseText!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'integer', nullable: true, name: 'last_matched_event_id' })
  lastMatchedEventId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
