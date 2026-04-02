import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'chat_message_settings' })
export class ChatMessageSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, default: 'global' })
  key!: string;

  @Column({ type: 'boolean', default: false, name: 'night_block_enabled' })
  nightBlockEnabled!: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'night_start' })
  nightStart!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'night_end' })
  nightEnd!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
