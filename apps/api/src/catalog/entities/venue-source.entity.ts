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

@Entity('venue_sources')
@Unique(['source', 'externalId'])
@Index(['venueId'])
@Index(['source', 'externalId'])
export class VenueSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venueId!: string;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue!: Venue;

  @Column({ type: 'varchar', length: 50 })
  source!: string; // 'google_places', 'delivery_site', 'erp'

  @Column({ type: 'varchar', length: 255 })
  externalId!: string; // e.g., Google place_id

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt?: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  rawHash?: string; // Hash of normalized payload for change detection

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
