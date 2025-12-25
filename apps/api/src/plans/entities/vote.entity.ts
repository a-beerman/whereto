import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Plan } from './plan.entity';
import { VoteCast } from './vote-cast.entity';
import { Venue } from '../../catalog/entities/venue.entity';

@Entity('votes')
@Index(['planId'])
@Index(['status'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn()
  plan!: Plan;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status!: 'open' | 'closed';

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  winnerVenueId?: string;

  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn()
  winnerVenue?: Venue;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => VoteCast, (voteCast) => voteCast.vote)
  voteCasts!: VoteCast[];
}
