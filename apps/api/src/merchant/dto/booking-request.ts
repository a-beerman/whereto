import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingRequest {
  @ApiProperty({ description: 'Booking request ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Plan ID (UUID)' })
  planId!: string;

  @ApiProperty({ description: 'Venue ID (UUID)' })
  venueId!: string;

  @ApiProperty({ description: 'Requested date', format: 'date' })
  requestedDate!: Date;

  @ApiProperty({ description: 'Requested time' })
  requestedTime!: string;

  @ApiProperty({ description: 'Number of participants' })
  participantsCount!: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({
    description: 'Booking status',
    enum: ['pending', 'confirmed', 'rejected', 'proposed', 'cancelled'],
  })
  status!: 'pending' | 'confirmed' | 'rejected' | 'proposed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Confirmed time', format: 'date-time' })
  confirmedTime?: Date;

  @ApiPropertyOptional({ description: 'Proposed time', format: 'date-time' })
  proposedTime?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Response time in seconds' })
  responseTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Merchant user ID who responded' })
  merchantUserId?: string;

  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', format: 'date-time' })
  updatedAt!: Date;
}
