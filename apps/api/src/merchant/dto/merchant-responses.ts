import { ApiProperty } from '@nestjs/swagger';
import { BookingRequest } from './booking-request';

export class BookingRequestMeta {
  @ApiProperty({ description: 'Total number of booking requests' })
  total!: number;

  @ApiProperty({ description: 'Number of pending requests' })
  pending!: number;
}

export class GetBookingRequestsResponse {
  @ApiProperty({ description: 'List of booking requests', type: [BookingRequest] })
  data!: BookingRequest[];

  @ApiProperty({ type: BookingRequestMeta })
  meta!: BookingRequestMeta;
}

export class ConfirmBookingData {
  @ApiProperty({ description: 'Booking request ID' })
  id!: string;

  @ApiProperty({ description: 'Booking status' })
  status!: string;

  @ApiProperty({ description: 'Confirmation timestamp', format: 'date-time' })
  confirmedAt!: Date;

  @ApiProperty({ description: 'Response time in seconds' })
  responseTimeSeconds!: number;
}

export class ConfirmBookingResponse {
  @ApiProperty({ type: ConfirmBookingData })
  data!: ConfirmBookingData;
}

export class RejectBookingData {
  @ApiProperty({ description: 'Booking request ID' })
  id!: string;

  @ApiProperty({ description: 'Booking status' })
  status!: string;

  @ApiProperty({ description: 'Rejection timestamp', format: 'date-time' })
  rejectedAt!: Date;

  @ApiProperty({ description: 'Response time in seconds' })
  responseTimeSeconds!: number;
}

export class RejectBookingResponse {
  @ApiProperty({ type: RejectBookingData })
  data!: RejectBookingData;
}

export class ProposeTimeData {
  @ApiProperty({ description: 'Booking request ID' })
  id!: string;

  @ApiProperty({ description: 'Booking status' })
  status!: string;

  @ApiProperty({ description: 'Proposed time', format: 'date-time' })
  proposedTime!: Date;

  @ApiProperty({ description: 'Proposal timestamp', format: 'date-time' })
  proposedAt!: Date;

  @ApiProperty({ description: 'Response time in seconds' })
  responseTimeSeconds!: number;
}

export class ProposeTimeResponse {
  @ApiProperty({ type: ProposeTimeData })
  data!: ProposeTimeData;
}

export class MerchantStatsData {
  @ApiProperty({ description: 'Total number of requests' })
  totalRequests!: number;

  @ApiProperty({ description: 'Number of confirmed requests' })
  confirmed!: number;

  @ApiProperty({ description: 'Number of rejected requests' })
  rejected!: number;

  @ApiProperty({ description: 'Number of pending requests' })
  pending!: number;

  @ApiProperty({ description: 'Confirmation rate' })
  confirmRate!: number;

  @ApiProperty({ description: 'Median response time in seconds' })
  medianResponseTimeSeconds!: number;

  @ApiProperty({ description: 'Average participants per request' })
  averageParticipantsPerRequest!: number;
}

export class GetStatsResponse {
  @ApiProperty({ type: MerchantStatsData })
  data!: MerchantStatsData;
}
