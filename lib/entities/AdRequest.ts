import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity({ name: 'ad_requests' })
export class AdRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, name: 'request_code' })
  requestCode!: string;  // REQ-YYYYMMDD-XXXX

  @Column({ type: 'varchar', name: 'applicant_name' })
  applicantName!: string;

  @Column({ type: 'varchar', name: 'applicant_contact' })
  applicantContact!: string;

  @Column({ type: 'varchar', name: 'content_type' })
  contentType!: string;

  @Column({ type: 'varchar', name: 'content_title' })
  contentTitle!: string;

  @Column({ type: 'text', name: 'content_body' })
  contentBody!: string;

  @Column({ type: 'varchar', nullable: true, name: 'content_url' })
  contentUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'llm_verdict' })
  llmVerdict!: string | null;  // 'compliant'|'non_compliant'|'needs_review'|'error'

  @Column({ type: 'text', nullable: true, name: 'llm_reason' })
  llmReason!: string | null;

  @Column({ type: 'text', nullable: true, name: 'llm_rule_ids' })
  llmRuleIds!: string | null;  // JSON array

  @Column({ type: 'text', nullable: true, name: 'llm_raw' })
  llmRaw!: string | null;

  @Column({ type: 'varchar', default: 'processing', name: 'llm_status' })
  llmStatus!: string;

  @Column({ type: 'varchar', nullable: true, name: 'llm_attempt_id' })
  llmAttemptId!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'policy_version' })
  policyVersion!: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status!: string;  // 'pending'|'approved'|'rejected'|'withdrawn'

  @Column({ type: 'text', nullable: true, name: 'admin_reason' })
  adminReason!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy!: User | null;

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
