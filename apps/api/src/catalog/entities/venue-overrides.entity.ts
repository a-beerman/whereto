import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Venue } from './venue.entity';

@Entity('venue_overrides')
@Unique(['venueId'])
@Index(['venueId'])
export class VenueOverrides {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  venueId!: string;

  @OneToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue!: Venue;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameOverride?: string;

  @Column({ type: 'text', nullable: true })
  addressOverride?: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  pinOverride?: any; // Override lat/lng

  @Column({ type: 'jsonb', nullable: true })
  categoryOverrides?: string[];

  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string; // Editor note

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy?: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
