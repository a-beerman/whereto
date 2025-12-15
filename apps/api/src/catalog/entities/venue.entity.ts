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
import { City } from './city.entity';
import { VenueSource } from './venue-source.entity';
import { VenueOverrides } from './venue-overrides.entity';
import { VenuePartner } from './venue-partner.entity';

@Entity('venues')
@Index(['cityId'])
@Index(['status'], { where: "status = 'active'" })
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  cityId!: string;

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cityId' })
  city!: City;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  address!: string;

  // Using PostGIS geography type (can be changed to lat/lng columns for native types)
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true, // Make nullable for now, will be required after migration
  })
  location: any; // PostGIS Point type

  // Alternative: native lat/lng columns (uncomment if not using PostGIS)
  // @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  // lat: number;
  // @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  // lng: number;

  @Column({ type: 'jsonb', nullable: true })
  @Index('idx_venues_categories', { using: 'GIN' })
  categories?: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'int', nullable: true })
  ratingCount?: number;

  @Column({ type: 'jsonb', nullable: true })
  photoRefs?: string[];

  @Column({ type: 'jsonb', nullable: true })
  hours?: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: 'active' | 'hidden' | 'duplicate';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => VenueSource, (source) => source.venue)
  sources!: VenueSource[];

  @OneToMany(() => VenueOverrides, (override) => override.venue)
  overrides!: VenueOverrides[];

  @OneToMany(() => VenuePartner, (partner) => partner.venue)
  partners!: VenuePartner[];

  @OneToMany(() => UserSavedVenue, (saved) => saved.venue)
  savedByUsers!: UserSavedVenue[];
}
