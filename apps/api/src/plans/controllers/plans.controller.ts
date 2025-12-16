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
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { VenueResponseDto } from '../../catalog/dto/venue-response.dto';
import { PlansService } from '../services/plans.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { JoinPlanDto } from '../dto/join-plan.dto';
import { VoteDto } from '../dto/vote.dto';
import { ClosePlanDto } from '../dto/close-plan.dto';
import { BookingRequestService } from '../../merchant/services/booking-request.service';
import { CreateBookingRequestDto } from '../../merchant/dto/create-booking-request.dto';
import { MetricsService } from '../../common/services/metrics.service';

@ApiTags('plans')
@ApiExtraModels(VenueResponseDto)
@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly bookingRequestService: BookingRequestService,
    private readonly metricsService: MetricsService,
  ) {}

  // TODO: Extract user ID from Telegram auth token
  private getUserId(req: Request): string {
    const userIdHeader = (req.headers as any)['x-user-id'];
    if (Array.isArray(userIdHeader)) {
      return userIdHeader[0] || 'default-user-id';
    }
    return userIdHeader || 'default-user-id';
  }

  @Post()
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiBody({ type: CreatePlanDto })
  @ApiOkResponse({
    description: 'Plan created successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            status: { type: 'string' },
            initiatorId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async createPlan(@Request() req: Request, @Body() dto: CreatePlanDto) {
    const plan = await this.plansService.createPlan({
      telegramChatId: parseInt(dto.telegramChatId, 10),
      initiatorId: dto.initiatorId,
      date: new Date(dto.date),
      time: dto.time,
      area: dto.area,
      cityId: dto.cityId,
      locationLat: dto.locationLat ? parseFloat(dto.locationLat) : undefined,
      locationLng: dto.locationLng ? parseFloat(dto.locationLng) : undefined,
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
  @ApiOperation({ summary: 'Join a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: JoinPlanDto })
  @ApiOkResponse({
    description: 'Successfully joined plan',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            joined: { type: 'boolean' },
          },
        },
      },
    },
  })
  async joinPlan(@Param('id') id: string, @Body() dto: JoinPlanDto) {
    await this.plansService.joinPlan(id, dto.userId, dto.preferences, {
      lat: dto.locationLat ? parseFloat(dto.locationLat) : undefined,
      lng: dto.locationLng ? parseFloat(dto.locationLng) : undefined,
    });
    return { data: { joined: true } };
  }

  @Get(':id/options')
  @ApiOperation({ summary: 'Get shortlist of venue options for a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Shortlist of venue options',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              venueId: { type: 'string' },
              venue: { $ref: getSchemaPath(VenueResponseDto) },
              score: { type: 'number' },
            },
          },
        },
        meetingPoint: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
      },
    },
  })
  async getShortlist(@Param('id') id: string) {
    const result = await this.plansService.getShortlist(id);
    return { data: result.venues, meetingPoint: result.meetingPoint };
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Start voting for a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Voting started and shortlist generated',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            vote: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                planId: { type: 'string' },
                status: { type: 'string' },
              },
            },
            options: {
              type: 'array',
              items: { $ref: getSchemaPath(VenueResponseDto) },
            },
          },
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Cast a vote for a venue in a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: VoteDto })
  @ApiOkResponse({
    description: 'Vote cast successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            voted: { type: 'boolean' },
          },
        },
      },
    },
  })
  async castVote(@Param('id') id: string, @Body() dto: VoteDto) {
    await this.plansService.castVote(id, dto.userId, dto.venueId);
    return { data: { voted: true } };
  }

  @Delete(':id/vote/cast')
  @ApiOperation({ summary: 'Remove a vote for a venue in a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: VoteDto })
  @ApiOkResponse({
    description: 'Vote removed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            removed: { type: 'boolean' },
          },
        },
      },
    },
  })
  async removeVote(@Param('id') id: string, @Body() dto: VoteDto) {
    await this.plansService.removeVote(id, dto.userId, dto.venueId);
    return { data: { removed: true } };
  }

  @Get(':id/vote/user/:userId')
  @ApiOperation({ summary: 'Get all votes for a user in a plan' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (Telegram user ID)' })
  @ApiOkResponse({
    description: 'User votes retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async getUserVotes(@Param('id') id: string, @Param('userId') userId: string) {
    const venueIds = await this.plansService.getUserVotes(id, userId);
    return { data: venueIds };
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a plan (initiator only)' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: ClosePlanDto })
  @ApiOkResponse({
    description: 'Plan closed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            winner: { $ref: getSchemaPath(VenueResponseDto) },
            status: { type: 'string' },
          },
        },
      },
    },
  })
  async closePlan(@Param('id') id: string, @Body() dto: ClosePlanDto) {
    const result = await this.plansService.closePlan(id, dto.initiatorId);
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details including votes and result' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiOkResponse({
    description: 'Plan details',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            status: { type: 'string' },
            initiatorId: { type: 'string' },
            participants: {
              type: 'array',
              items: { type: 'object' },
            },
            votes: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  })
  async getPlanDetails(@Param('id') id: string) {
    const plan = await this.plansService.getPlanDetails(id);
    return { data: plan };
  }

  @Post(':id/booking-request')
  @ApiOperation({ summary: 'Request a booking for the winning venue (partner venues only)' })
  @ApiParam({ name: 'id', description: 'Plan ID (UUID)' })
  @ApiBody({ type: CreateBookingRequestDto })
  @ApiOkResponse({
    description: 'Booking request created successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            planId: { type: 'string' },
            venueId: { type: 'string' },
            status: { type: 'string' },
            requestedDate: { type: 'string', format: 'date' },
            requestedTime: { type: 'string' },
            participantsCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  @ApiBadRequestResponse({ description: 'Plan is not closed' })
  async createBookingRequest(@Param('id') planId: string, @Body() dto: CreateBookingRequestDto) {
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
