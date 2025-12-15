import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PlanRepository } from '../repositories/plan.repository';
import { ParticipantRepository } from '../repositories/participant.repository';
import { VoteRepository } from '../repositories/vote.repository';
import { VoteCastRepository } from '../repositories/vote-cast.repository';
import { ShortlistService } from './shortlist.service';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { Plan } from '../entities/plan.entity';
import { Vote } from '../entities/vote.entity';

@Injectable()
export class PlansService {
  constructor(
    private readonly planRepository: PlanRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly voteRepository: VoteRepository,
    private readonly voteCastRepository: VoteCastRepository,
    private readonly shortlistService: ShortlistService,
    private readonly venueRepository: VenueRepository,
  ) {}

  async createPlan(data: {
    telegramChatId: number;
    initiatorId: string;
    date: Date;
    time: string;
    area?: string;
    cityId?: string;
    locationLat?: number;
    locationLng?: number;
    budget?: string;
    format?: string;
  }): Promise<Plan> {
    const plan = await this.planRepository.create({
      ...data,
      status: 'open',
    });

    // Auto-join initiator as participant
    await this.participantRepository.create({
      planId: plan.id,
      userId: data.initiatorId,
    });

    return plan;
  }

  async joinPlan(
    planId: string,
    userId: string,
    preferences?: any,
    location?: { lat?: number; lng?: number },
  ): Promise<void> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    if (plan.status !== 'open' && plan.status !== 'voting') {
      throw new BadRequestException(`Cannot join plan with status ${plan.status}`);
    }

    await this.participantRepository.upsert(planId, userId, {
      preferences,
      locationLat: location?.lat,
      locationLng: location?.lng,
    });
  }

  async getShortlist(
    planId: string,
  ): Promise<{ venues: any[]; meetingPoint: { lat: number; lng: number } }> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    const participants = await this.participantRepository.findByPlanId(planId);
    if (participants.length === 0) {
      throw new BadRequestException('Plan has no participants');
    }

    const result = await this.shortlistService.generateShortlist(plan, participants);

    // Convert venues to response format
    const venues = await Promise.all(
      result.venues.map(async (venue) => {
        const fullVenue = await this.venueRepository.findById(venue.id);
        if (!fullVenue) return null;

        const overrides = fullVenue.overrides?.[0];
        const venueWithOverrides = this.venueRepository.applyOverrides(fullVenue, overrides);

        // Extract lat/lng
        let lat: number | undefined;
        let lng: number | undefined;
        if (venueWithOverrides.location) {
          if (typeof venueWithOverrides.location === 'object') {
            lng = venueWithOverrides.location.x || venueWithOverrides.location.lng;
            lat = venueWithOverrides.location.y || venueWithOverrides.location.lat;
          }
        }

        return {
          venueId: venueWithOverrides.id,
          venue: {
            id: venueWithOverrides.id,
            name: venueWithOverrides.name,
            address: venueWithOverrides.address,
            lat,
            lng,
            categories: venueWithOverrides.categories,
            rating: venueWithOverrides.rating ? Number(venueWithOverrides.rating) : undefined,
            ratingCount: venueWithOverrides.ratingCount,
            photoRefs: venueWithOverrides.photoRefs,
          },
        };
      }),
    );

    return {
      venues: venues.filter((v) => v !== null),
      meetingPoint: result.meetingPoint,
    };
  }

  async startVoting(planId: string, durationHours: number = 6): Promise<Vote> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    if (plan.status !== 'open') {
      throw new BadRequestException(`Cannot start voting for plan with status ${plan.status}`);
    }

    // Generate shortlist first
    await this.getShortlist(planId);

    // Create vote
    const votingEndsAt = new Date();
    votingEndsAt.setHours(votingEndsAt.getHours() + durationHours);

    const vote = await this.voteRepository.create({
      planId,
      status: 'open',
      startedAt: new Date(),
    });

    // Update plan status
    await this.planRepository.update(planId, {
      status: 'voting',
      votingEndsAt,
    });

    return vote;
  }

  async castVote(planId: string, userId: string, venueId: string): Promise<void> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    if (plan.status !== 'voting') {
      throw new BadRequestException(`Cannot vote for plan with status ${plan.status}`);
    }

    // Check if user is a participant
    const participant = await this.participantRepository.findByPlanIdAndUserId(planId, userId);
    if (!participant) {
      throw new ForbiddenException('User must join plan before voting');
    }

    // Get active vote
    const vote = await this.voteRepository.findActiveByPlanId(planId);
    if (!vote) {
      throw new BadRequestException('No active vote found for this plan');
    }

    // Verify venue exists
    const venue = await this.venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundException(`Venue with id ${venueId} not found`);
    }

    // Cast or update vote
    await this.voteCastRepository.upsert(vote.id, planId, userId, venueId);
  }

  async closePlan(planId: string, initiatorId: string): Promise<{ plan: Plan; winner: any }> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    if (plan.initiatorId !== initiatorId) {
      throw new ForbiddenException('Only plan initiator can close the plan');
    }

    if (plan.status === 'closed') {
      throw new BadRequestException('Plan is already closed');
    }

    // Get active vote and count votes
    const vote = await this.voteRepository.findActiveByPlanId(planId);
    if (!vote) {
      throw new BadRequestException('No active vote found. Start voting first.');
    }

    const voteCounts = await this.voteCastRepository.getVoteCounts(vote.id);

    if (voteCounts.size === 0) {
      throw new BadRequestException('No votes cast. Cannot close plan without votes.');
    }

    // Find winner (venue with most votes)
    let winnerVenueId: string | null = null;
    let maxVotes = 0;

    for (const [venueId, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerVenueId = venueId;
      }
    }

    if (!winnerVenueId) {
      throw new BadRequestException('Could not determine winner');
    }

    // Close vote
    await this.voteRepository.close(vote.id, winnerVenueId);

    // Close plan
    const closedPlan = await this.planRepository.close(planId, winnerVenueId);

    // Get winner venue details
    const winnerVenue = await this.venueRepository.findById(winnerVenueId);
    if (!winnerVenue) {
      throw new NotFoundException(`Winner venue with id ${winnerVenueId} not found`);
    }

    const overrides = winnerVenue.overrides?.[0];
    const winnerWithOverrides = this.venueRepository.applyOverrides(winnerVenue, overrides);

    return {
      plan: closedPlan,
      winner: {
        venueId: winnerWithOverrides.id,
        venue: winnerWithOverrides,
        voteCount: maxVotes,
      },
    };
  }

  async getPlanDetails(planId: string): Promise<Plan> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }
    return plan;
  }
}
