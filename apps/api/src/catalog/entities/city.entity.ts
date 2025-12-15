import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Venue } from './venue.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'char', length: 2 })
  countryCode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  centerLat!: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  centerLng!: number;

  @Column({ type: 'jsonb', nullable: true })
  bounds?: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Venue, (venue) => venue.city)
  venues!: Venue[];
}
