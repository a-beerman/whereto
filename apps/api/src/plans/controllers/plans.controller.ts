import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  NotFoundException,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { VenueResponse } from '../../catalog/dto/venue-response';
import { PlansService } from '../services/plans.service';
import { CreatePlan } from '../dto/create-plan';
import { JoinPlan } from '../dto/join-plan';
import { Vote } from '../dto/vote';
import { ClosePlan } from '../dto/close-plan';
import { BookingRequestService } from '../../merchant/services/booking-request.service';
import { CreateBookingRequest } from '../../merchant/dto/create-booking-request';
import { MetricsService } from '../../common/services/metrics.service';
import {
  PlanDetailsResponse,
  CreatePlanResponse,
  JoinPlanResponse,
  GetShortlistResponse,
  StartVotingResponse,
  CastVoteResponse,
  RemoveVoteResponse,
  GetUserVotesResponse,
  ClosePlanResponse,
  CreateBookingRequestResponse,
} from '../dto/plan-responses';

@ApiTags('plans')
@ApiExtraModels(
  VenueResponse,
  PlanDetailsResponse,
  CreatePlanResponse,
  JoinPlanResponse,
  GetShortlistResponse,
  StartVotingResponse,
  CastVoteResponse,
  RemoveVoteResponse,
  GetUserVotesResponse,
  ClosePlanResponse,
  CreateBookingRequestResponse,
)
@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly bookingRequestService: BookingRequestService,
    private readonly metricsService: MetricsService,
  ) {}

  // TODO: Extract user ID from Telegram auth token
  private getUserId(req: Request): string {
    const headers = req.headers as unknown as Record<string, string | string[] | undefined>;
    const userIdHeader = headers['x-user-id'];
    if (Array.isArray(userIdHeader)) {
      return userIdHeader[0] || 'default-user-id';
    }
    return userIdHeader || 'default-user-id';
  }

  @Post()
  @ApiOperation({ summary: 'Create a new plan', operationId: 'Plans_createPlan' })
  @ApiBody({ type: CreatePlan })
  @ApiCreatedResponse({
    description: 'Plan created successfully',
    type: CreatePlanResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid request payload' })
  async createPlan(@Request() req: Request, @Body() dto: CreatePlan) {
    const chatIdNumber = Number(dto.telegramChatId);
    if (!Number.isFinite(chatIdNumber)) {
      throw new BadRequestException('Invalid telegramChatId');
    }

    const locationLat = dto.locationLat ? Number(dto.locationLat) : undefined;
    const locationLng = dto.locationLng ? Number(dto.locationLng) : undefined;
    if (locationLat !== undefined && !Number.isFinite(locationLat)) {
      throw new BadRequestException('Invalid locationLat');
    }
    if (locationLng !== undefined && !Number.isFinite(locationLng)) {
      throw new BadRequestException('Invalid locationLng');
    }

    const plan = await this.plansService.createPlan({
      telegramChatId: chatIdNumber,
      initiatorId: dto.initiatorId,
      date: new Date(dto.date),
      time: dto.time,
      area: dto.area,
      cityId: dto.cityId,
      locationLat,
      locationLng,
      budget: dto.budget,
      format: dto.format,
    });

    // Track plan_created event
    this.metricsService.trackProductEvent({
      event: 'plan_created',
      userId: dto.initiatorId,
      planId: plan.id,
      cityId: dto.cityId,
      timestamp: new Date(),
      metadata: {
        format: dto.format,
        budget: dto.budget,
        area: dto.area,
      },
    });

    return { data: plan };
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a plan', operationId: 'Plans_joinPlan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: JoinPlan })
  @ApiOkResponse({
    description: 'Successfully joined plan',
    type: JoinPlanResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async joinPlan(@Param('id') id: string, @Body() dto: JoinPlan) {
    await this.plansService.joinPlan(
      id,
      dto.userId,
      dto.preferences as Record<string, unknown> | undefined,
      {
        lat: dto.locationLat ? parseFloat(dto.locationLat) : undefined,
        lng: dto.locationLng ? parseFloat(dto.locationLng) : undefined,
      },
    );
    return { data: { joined: true } };
  }

  @Get(':id/options')
  @ApiOperation({
    summary: 'Get shortlist of venue options for a plan',
    operationId: 'Plans_getShortlist',
  })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Shortlist of venue options',
    type: GetShortlistResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async getShortlist(@Param('id') id: string) {
    const result = await this.plansService.getShortlist(id);
    return { data: result.venues, meetingPoint: result.meetingPoint };
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Start voting for a plan', operationId: 'Plans_startVoting' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Voting started and shortlist generated',
    type: StartVotingResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async startVoting(@Param('id') id: string) {
    // Start voting and generate shortlist
    const vote = await this.plansService.startVoting(id);
    const shortlist = await this.plansService.getShortlist(id);
    return {
      data: {
        vote,
        options: shortlist.venues,
      },
    };
  }

  @Post(':id/vote/cast')
  @ApiOperation({ summary: 'Cast a vote for a venue in a plan', operationId: 'Plans_castVote' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: Vote })
  @ApiOkResponse({
    description: 'Vote cast successfully',
    type: CastVoteResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async castVote(@Param('id') id: string, @Body() dto: Vote) {
    await this.plansService.castVote(id, dto.userId, dto.venueId);
    return { data: { voted: true } };
  }

  @Delete(':id/vote/cast')
  @ApiOperation({ summary: 'Remove a vote for a venue in a plan', operationId: 'Plans_removeVote' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: Vote })
  @ApiOkResponse({
    description: 'Vote removed successfully',
    type: RemoveVoteResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async removeVote(@Param('id') id: string, @Body() dto: Vote) {
    await this.plansService.removeVote(id, dto.userId, dto.venueId);
    return { data: { removed: true } };
  }

  @Get(':id/vote/user/:userId')
  @ApiOperation({
    summary: 'Get all votes for a user in a plan',
    operationId: 'Plans_getUserVotes',
  })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (Telegram user ID)' })
  @ApiOkResponse({
    description: 'User votes retrieved successfully',
    type: GetUserVotesResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async getUserVotes(@Param('id') id: string, @Param('userId') userId: string) {
    const venueIds = await this.plansService.getUserVotes(id, userId);
    return { data: venueIds };
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a plan (initiator only)', operationId: 'Plans_closePlan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: ClosePlan })
  @ApiOkResponse({
    description: 'Plan closed successfully',
    type: ClosePlanResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async closePlan(@Param('id') id: string, @Body() dto: ClosePlan) {
    const result = await this.plansService.closePlan(id, dto.initiatorId);
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get plan details including votes and result',
    operationId: 'Plans_getPlanDetails',
  })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Plan details',
    type: PlanDetailsResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async getPlanDetails(@Param('id') id: string) {
    const plan = await this.plansService.getPlanDetails(id);
    return { data: plan };
  }

  @Post(':id/booking-request')
  @ApiOperation({
    summary: 'Request a booking for the winning venue (partner venues only)',
    operationId: 'Plans_createBookingRequest',
  })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: CreateBookingRequest })
  @ApiOkResponse({
    description: 'Booking request created successfully',
    type: CreateBookingRequestResponse,
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  @ApiBadRequestResponse({ description: 'Plan is not closed' })
  async createBookingRequest(@Param('id') planId: string, @Body() dto: CreateBookingRequest) {
    // Verify plan exists and is closed
    const plan = await this.plansService.getPlanDetails(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    if (plan.status !== 'closed') {
      throw new BadRequestException('Booking requests can only be created for closed plans');
    }

    const bookingRequest = await this.bookingRequestService.createBookingRequest({
      planId,
      venueId: dto.venueId,
      requestedDate: new Date(dto.requestedDate),
      requestedTime: dto.requestedTime,
      participantsCount: dto.participantsCount,
      notes: dto.notes,
    });

    return { data: bookingRequest };
  }
}
