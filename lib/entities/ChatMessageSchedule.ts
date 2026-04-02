import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'chat_message_schedules' })
export class ChatMessageSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'message_type' })
  scheduleName!: string;

  @Column({ type: 'text', name: 'message_text' })
  messageText!: string;

  @Column({ type: 'varchar' })
  mode!: string;

  @Column({ type: 'integer', nullable: true, name: 'interval_minutes' })
  intervalMinutes!: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'fixed_time' })
  fixedTime!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'last_dispatched_at' })
  lastDispatchedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
