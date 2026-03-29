import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar', name: 'target_type' })
  targetType!: string;

  @Column({ type: 'integer', name: 'target_id' })
  targetId!: number;

  @Column({ type: 'integer', name: 'actor_id' })
  actorId!: number;

  @Column({ type: 'varchar', name: 'actor_name' })
  actorName!: string;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
