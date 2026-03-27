import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'policy_revisions' })
@Index(['policyKey', 'version'], { unique: true })
export class PolicyRevision {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', name: 'policy_key' })
  policyKey!: string;

  @Column({ type: 'varchar' })
  version!: string;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
