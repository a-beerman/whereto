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
import { UserSavedVenue } from './user-saved-venue.entity';
import { Coordinates } from '../types/coordinates.type';

@Entity('venues')
@Index(['cityId'])
@Index(['status'], { where: "status = 'active'" })
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  cityId!: string;

  @ManyToOne(() => City, { onDelete: 'CASCADE' })
  @JoinColumn()
  city!: City;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  address!: string;

  // Using PostgreSQL native POINT type (no PostGIS required)
  // Stores as POINT(lng, lat) in PostgreSQL
  @Column({
    type: 'point',
    nullable: true,
    transformer: {
      // Transform from PostgreSQL point format "(lng,lat)" to Coordinates object
      from: (value: unknown): Coordinates | null => {
        if (!value) return null;

        // Handle object format { x: lng, y: lat } returned by some PostgreSQL drivers
        if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
          const point = value as { x: number; y: number };
          return {
            type: 'Point',
            coordinates: [point.x, point.y],
          };
        }

        // Handle string format "(lng,lat)" or "(lng, lat)"
        if (typeof value === 'string') {
          const match = value.match(/\(([^,]+),\s*([^)]+)\)/);
          if (!match) return null;
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          return {
            type: 'Point',
            coordinates: [lng, lat],
          };
        }

        return null;
      },
      // Transform from Coordinates object to PostgreSQL point format "(lng,lat)"
      to: (value: Coordinates | null): string | null => {
        if (!value || !value.coordinates || value.coordinates.length !== 2) {
          return null;
        }
        const [lng, lat] = value.coordinates;
        return `(${lng},${lat})`;
      },
    },
  })
  location?: Coordinates;

  @Column({ type: 'jsonb', nullable: true })
  // GIN index created via migration (see migrations/1700000000000-InitialSchema.ts)
  categories?: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @Column({ type: 'int', nullable: true })
  ratingCount?: number;

  @Column({ type: 'jsonb', nullable: true })
  photoRefs?: string[];

  @Column({ type: 'jsonb', nullable: true })
  hours?: {
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text?: string[];
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website?: string;

  @Column({ type: 'jsonb', nullable: true })
  socialMedia?: {
    // Social networks
    facebook?: string;
    instagram?: string;
    twitter?: string;
    // Messengers (very popular in CIS countries)
    telegram?: string; // Telegram username or link
    whatsapp?: string; // WhatsApp phone number or link
    viber?: string; // Viber phone number or link
    messenger?: string; // Facebook Messenger link
  };

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
