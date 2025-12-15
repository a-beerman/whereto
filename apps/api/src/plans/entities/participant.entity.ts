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
import { Plan } from './plan.entity';

@Entity('participants')
@Unique(['planId', 'userId'])
@Index(['planId'])
@Index(['userId'])
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan!: Plan;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId!: string; // Telegram user ID

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    format?: string;
    budget?: string;
    cuisine?: string[];
    alcohol?: 'yes' | 'no' | 'neutral';
    quiet?: boolean;
    outdoor?: boolean;
    kidsFriendly?: boolean;
  };

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  locationLat?: number; // For "midpoint" calculation

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  locationLng?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
