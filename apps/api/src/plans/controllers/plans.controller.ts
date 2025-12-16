import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PlansService } from '../services/plans.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { JoinPlanDto } from '../dto/join-plan.dto';
import { VoteDto } from '../dto/vote.dto';
import { ClosePlanDto } from '../dto/close-plan.dto';
import { BookingRequestService } from '../../merchant/services/booking-request.service';
import { CreateBookingRequestDto } from '../../merchant/dto/create-booking-request.dto';
import { MetricsService } from '../../common/services/metrics.service';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly bookingRequestService: BookingRequestService,
    private readonly metricsService: MetricsService,
  ) {}

  // TODO: Extract user ID from Telegram auth token
  private getUserId(req: Request): string {
    return (req.headers['x-user-id'] as string) || 'default-user-id';
  }

  @Post()
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
  async joinPlan(@Param('id') id: string, @Body() dto: JoinPlanDto) {
    await this.plansService.joinPlan(id, dto.userId, dto.preferences, {
      lat: dto.locationLat ? parseFloat(dto.locationLat) : undefined,
      lng: dto.locationLng ? parseFloat(dto.locationLng) : undefined,
    });
    return { data: { joined: true } };
  }

  @Get(':id/options')
  async getShortlist(@Param('id') id: string) {
    const result = await this.plansService.getShortlist(id);
    return { data: result.venues, meetingPoint: result.meetingPoint };
  }

  @Post(':id/vote')
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
  async castVote(@Param('id') id: string, @Body() dto: VoteDto) {
    await this.plansService.castVote(id, dto.userId, dto.venueId);
    return { data: { voted: true } };
  }

  @Post(':id/close')
  async closePlan(@Param('id') id: string, @Body() dto: ClosePlanDto) {
    const result = await this.plansService.closePlan(id, dto.initiatorId);
    return { data: result };
  }

  @Get(':id')
  async getPlanDetails(@Param('id') id: string) {
    const plan = await this.plansService.getPlanDetails(id);
    return { data: plan };
  }

  @Post(':id/booking-request')
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
