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
import { Coordinates } from '../types/coordinates.type';

@Entity('venue_overrides')
@Unique(['venueId'])
@Index(['venueId'])
export class VenueOverrides {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  venueId!: string;

  @OneToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn()
  venue!: Venue;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameOverride?: string;

  @Column({ type: 'text', nullable: true })
  addressOverride?: string;

  @Column({
    type: 'point',
    nullable: true,
    transformer: {
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
      to: (value: Coordinates | null): string | null => {
        if (!value || !value.coordinates || value.coordinates.length !== 2) {
          return null;
        }
        const [lng, lat] = value.coordinates;
        return `(${lng},${lat})`;
      },
    },
  })
  pinOverride?: Coordinates; // Override location

  @Column({ type: 'jsonb', nullable: true })
  categoryOverrides?: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  phoneOverride?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  websiteOverride?: string;

  @Column({ type: 'jsonb', nullable: true })
  socialMediaOverride?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    telegram?: string;
    whatsapp?: string;
    viber?: string;
    messenger?: string;
  };

  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string; // Editor note

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy?: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
