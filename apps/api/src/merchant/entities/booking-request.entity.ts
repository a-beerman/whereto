import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Plan } from '../../plans/entities/plan.entity';
import { Venue } from '../../catalog/entities/venue.entity';

@Entity('booking_requests')
@Index(['planId'])
@Index(['venueId'])
@Index(['status'])
@Index(['merchantUserId'])
@Index(['requestedDate'])
export class BookingRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan!: Plan;

  @Column({ type: 'uuid' })
  @Index()
  venueId!: string;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venueId' })
  venue!: Venue;

  @Column({ type: 'date' })
  @Index()
  requestedDate!: Date;

  @Column({ type: 'time' })
  requestedTime!: string;

  @Column({ type: 'int' })
  participantsCount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: 'pending' | 'confirmed' | 'rejected' | 'proposed' | 'cancelled';

  @Column({ type: 'timestamptz', nullable: true })
  confirmedTime?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  proposedTime?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'int', nullable: true })
  responseTimeSeconds?: number; // Time from request to merchant response

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  merchantUserId?: string; // Merchant who responded

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
