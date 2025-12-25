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
  userId!: string; // Telegram user ID or UUID

  @Column({ type: 'uuid' })
  venueId!: string;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn()
  venue!: Venue;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
