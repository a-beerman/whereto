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
import { Vote } from './vote.entity';
import { Plan } from './plan.entity';
import { Venue } from '../../catalog/entities/venue.entity';

@Entity('vote_casts')
@Unique(['voteId', 'userId', 'venueId']) // Allow multiple votes per user (multiple choice)
@Index(['voteId'])
@Index(['planId'])
@Index(['userId'])
@Index(['venueId'])
export class VoteCast {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  voteId!: string;

  @ManyToOne(() => Vote, { onDelete: 'CASCADE' })
  @JoinColumn()
  vote!: Vote;

  @Column({ type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn()
  plan!: Plan;

  @Column({ type: 'varchar', length: 255 })
  userId!: string; // Telegram user ID

  @Column({ type: 'uuid' })
  venueId!: string;

  @ManyToOne(() => Venue)
  @JoinColumn()
  venue!: Venue;

  @CreateDateColumn({ type: 'timestamptz' })
  castAt!: Date;
}
