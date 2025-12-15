import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Venue } from './venue.entity';

@Entity('venue_partners')
@Unique(['venueId'])
@Index(['venueId'])
@Index(['isActive'], { where: 'is_active = true' })
@Index(['merchantUserId'])
export class VenuePartner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  venueId!: string;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue!: Venue;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  merchantUserId?: string; // Telegram user ID or merchant account ID

  @Column({ type: 'int', default: 300 })
  responseTimeTargetSeconds!: number; // Target: 5 minutes

  @Column({ type: 'varchar', length: 20, nullable: true })
  subscriptionTier?: string; // 'free', 'starter', 'pro'

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionExpiresAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
