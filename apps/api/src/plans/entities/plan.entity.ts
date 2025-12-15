import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Participant } from './participant.entity';
import { Vote } from './vote.entity';
import { Venue } from '../../catalog/entities/venue.entity';

@Entity('plans')
@Index(['telegramChatId'])
@Index(['status'])
@Index(['initiatorId'])
@Index(['date'])
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'bigint' })
  @Index()
  telegramChatId!: number; // Telegram group chat ID

  @Column({ type: 'varchar', length: 255 })
  @Index()
  initiatorId!: string; // Telegram user ID

  @Column({ type: 'date' })
  @Index()
  date!: Date;

  @Column({ type: 'time' })
  time!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area?: string; // Area name or "midpoint"

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  locationLat?: number; // If specific location

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  locationLng?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  budget?: string; // '$', '$$', '$$$'

  @Column({ type: 'varchar', length: 50, nullable: true })
  format?: string; // 'dinner', 'bar', 'coffee', etc.

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status!: 'open' | 'voting' | 'closed' | 'cancelled';

  @Column({ type: 'timestamptz', nullable: true })
  votingEndsAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  winningVenueId?: string;

  @ManyToOne(() => Venue, { nullable: true })
  @JoinColumn({ name: 'winningVenueId' })
  winningVenue?: Venue;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Participant, (participant) => participant.plan)
  participants!: Participant[];

  @OneToMany(() => Vote, (vote) => vote.plan)
  votes!: Vote[];
}
