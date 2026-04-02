import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'chat_message_directs' })
export class ChatMessageDirect {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', name: 'message_text' })
  messageText!: string;

  @Column({ type: 'integer', name: 'created_by_id' })
  createdById!: number;

  @Column({ type: 'varchar', name: 'created_by_name' })
  createdByName!: string;

  @Column({ type: 'datetime', nullable: true, name: 'dispatched_at' })
  dispatchedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
