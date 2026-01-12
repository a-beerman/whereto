import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VenueResponse } from '../../catalog/dto/venue-response';

export class PlanDetailsData {
  @ApiProperty({ description: 'Plan ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Plan date', format: 'date' })
  date!: string;

  @ApiProperty({ description: 'Plan time' })
  time!: string;

  @ApiProperty({ description: 'Plan status' })
  status!: string;

  @ApiProperty({ description: 'Initiator user ID' })
  initiatorId!: string;

  @ApiPropertyOptional({ description: 'Participants', type: [Object] })
  participants?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Votes', type: [Object] })
  votes?: Record<string, unknown>[];
}

export class PlanDetailsResponse {
  @ApiProperty({ type: PlanDetailsData })
  data!: PlanDetailsData;
}

export class CreatePlanData {
  @ApiProperty({ description: 'Plan ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Plan date', format: 'date' })
  date!: string;

  @ApiProperty({ description: 'Plan time' })
  time!: string;

  @ApiProperty({ description: 'Plan status' })
  status!: string;

  @ApiProperty({ description: 'Initiator user ID' })
  initiatorId!: string;

  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  createdAt!: Date;
}

export class CreatePlanResponse {
  @ApiProperty({ type: CreatePlanData })
  data!: CreatePlanData;
}

export class JoinPlanData {
  @ApiProperty({ description: 'Whether user joined successfully' })
  joined!: boolean;
}

export class JoinPlanResponse {
  @ApiProperty({ type: JoinPlanData })
  data!: JoinPlanData;
}

export class ShortlistOption {
  @ApiProperty({ description: 'Venue ID' })
  venueId!: string;

  @ApiProperty({ type: VenueResponse })
  venue!: VenueResponse;

  @ApiProperty({ description: 'Score' })
  score!: number;
}

export class MeetingPoint {
  @ApiProperty({ description: 'Latitude' })
  lat!: number;

  @ApiProperty({ description: 'Longitude' })
  lng!: number;
}

export class GetShortlistResponse {
  @ApiProperty({ type: [ShortlistOption] })
  data!: ShortlistOption[];

  @ApiProperty({ type: MeetingPoint })
  meetingPoint!: MeetingPoint;
}

export class VoteInfo {
  @ApiProperty({ description: 'Vote ID' })
  id!: string;

  @ApiProperty({ description: 'Plan ID' })
  planId!: string;

  @ApiProperty({ description: 'Vote status' })
  status!: string;
}

export class StartVotingData {
  @ApiProperty({ type: VoteInfo })
  vote!: VoteInfo;

  @ApiProperty({ type: [VenueResponse] })
  options!: VenueResponse[];
}

export class StartVotingResponse {
  @ApiProperty({ type: StartVotingData })
  data!: StartVotingData;
}

export class CastVoteData {
  @ApiProperty({ description: 'Whether vote was cast successfully' })
  voted!: boolean;
}

export class CastVoteResponse {
  @ApiProperty({ type: CastVoteData })
  data!: CastVoteData;
}

export class RemoveVoteData {
  @ApiProperty({ description: 'Whether vote was removed successfully' })
  removed!: boolean;
}

export class RemoveVoteResponse {
  @ApiProperty({ type: RemoveVoteData })
  data!: RemoveVoteData;
}

export class GetUserVotesResponse {
  @ApiProperty({ description: 'Array of venue IDs', type: [String] })
  data!: string[];
}

export class ClosePlanData {
  @ApiPropertyOptional({ type: VenueResponse })
  winner?: VenueResponse;

  @ApiProperty({ description: 'Plan status' })
  status!: string;
}

export class ClosePlanResponse {
  @ApiProperty({ type: ClosePlanData })
  data!: ClosePlanData;
}

export class BookingRequestData {
  @ApiProperty({ description: 'Booking request ID' })
  id!: string;

  @ApiProperty({ description: 'Plan ID' })
  planId!: string;

  @ApiProperty({ description: 'Venue ID' })
  venueId!: string;

  @ApiProperty({ description: 'Booking status' })
  status!: string;

  @ApiProperty({ description: 'Requested date', format: 'date' })
  requestedDate!: string;

  @ApiProperty({ description: 'Requested time' })
  requestedTime!: string;

  @ApiProperty({ description: 'Number of participants' })
  participantsCount!: number;

  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  createdAt!: Date;
}

export class CreateBookingRequestResponse {
  @ApiProperty({ type: BookingRequestData })
  data!: BookingRequestData;
}
