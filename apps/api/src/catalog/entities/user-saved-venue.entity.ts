import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Venue } from './venue.entity';

@Entity('user_saved_venues')
@Unique(['userId', 'venueId'])
@Index(['userId'])
@Index(['venueId'])
export class UserSavedVenue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId!: string; // Telegram user ID or UUID

  @Column({ type: 'uuid' })
  @Index()
  venueId!: string;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue!: Venue;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
