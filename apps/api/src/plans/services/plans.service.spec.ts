import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanRepository } from '../repositories/plan.repository';
import { ParticipantRepository } from '../repositories/participant.repository';
import { VoteRepository } from '../repositories/vote.repository';
import { VoteCastRepository } from '../repositories/vote-cast.repository';
import { ShortlistService } from './shortlist.service';
import { VenueRepository } from '../../catalog/repositories/venue.repository';
import { Plan } from '../entities/plan.entity';
import { Participant } from '../entities/participant.entity';
import { Vote } from '../entities/vote.entity';

describe('PlansService', () => {
  let service: PlansService;
  let planRepository: jest.Mocked<PlanRepository>;
  let participantRepository: jest.Mocked<ParticipantRepository>;
  let voteRepository: jest.Mocked<VoteRepository>;
  let voteCastRepository: jest.Mocked<VoteCastRepository>;
  let shortlistService: jest.Mocked<ShortlistService>;
  let venueRepository: jest.Mocked<VenueRepository>;

  const mockPlanRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
  };

  const mockParticipantRepository = {
    create: jest.fn(),
    findByPlanId: jest.fn(),
    findByPlanIdAndUserId: jest.fn(),
    upsert: jest.fn(),
  };

  const mockVoteRepository = {
    create: jest.fn(),
    findActiveByPlanId: jest.fn(),
    close: jest.fn(),
  };

  const mockVoteCastRepository = {
    upsert: jest.fn(),
    getVoteCounts: jest.fn(),
  };

  const mockShortlistService = {
    generateShortlist: jest.fn(),
  };

  const mockVenueRepository = {
    findById: jest.fn(),
    applyOverrides: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PlanRepository,
          useValue: mockPlanRepository,
        },
        {
          provide: ParticipantRepository,
          useValue: mockParticipantRepository,
        },
        {
          provide: VoteRepository,
          useValue: mockVoteRepository,
        },
        {
          provide: VoteCastRepository,
          useValue: mockVoteCastRepository,
        },
        {
          provide: ShortlistService,
          useValue: mockShortlistService,
        },
        {
          provide: VenueRepository,
          useValue: mockVenueRepository,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    planRepository = module.get(PlanRepository);
    participantRepository = module.get(ParticipantRepository);
    voteRepository = module.get(VoteRepository);
    voteCastRepository = module.get(VoteCastRepository);
    shortlistService = module.get(ShortlistService);
    venueRepository = module.get(VenueRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('should create a plan and auto-join initiator', async () => {
      // Arrange
      const planData = {
        telegramChatId: 123456,
        initiatorId: 'user-123',
        date: new Date('2024-01-15'),
        time: '19:00',
        cityId: 'city-123',
        area: 'city-center',
        budget: '$$',
        format: 'dinner',
      };

      const mockPlan = {
        id: 'plan-123',
        ...planData,
        status: 'open',
      } as Plan;

      planRepository.create.mockResolvedValue(mockPlan);
      participantRepository.create.mockResolvedValue({} as Participant);

      // Act
      const result = await service.createPlan(planData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('plan-123');
      expect(planRepository.create).toHaveBeenCalledWith({
        ...planData,
        status: 'open',
      });
      expect(participantRepository.create).toHaveBeenCalledWith({
        planId: 'plan-123',
        userId: 'user-123',
      });
    });
  });

  describe('joinPlan', () => {
    it('should allow user to join an open plan', async () => {
      // Arrange
      const planId = 'plan-123';
      const userId = 'user-456';
      const mockPlan = {
        id: planId,
        status: 'open',
      } as Plan;

      planRepository.findById.mockResolvedValue(mockPlan);
      participantRepository.upsert.mockResolvedValue(undefined);

      // Act
      await service.joinPlan(planId, userId, { cuisine: ['italian'] });

      // Assert
      expect(planRepository.findById).toHaveBeenCalledWith(planId);
      expect(participantRepository.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when plan does not exist', async () => {
      // Arrange
      planRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.joinPlan('non-existent', 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when plan is closed', async () => {
      // Arrange
      const mockPlan = {
        id: 'plan-123',
        status: 'closed',
      } as Plan;

      planRepository.findById.mockResolvedValue(mockPlan);

      // Act & Assert
      await expect(service.joinPlan('plan-123', 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('castVote', () => {
    it('should allow participant to cast vote', async () => {
      // Arrange
      const planId = 'plan-123';
      const userId = 'user-123';
      const venueId = 'venue-123';

      const mockPlan = {
        id: planId,
        status: 'voting',
      } as Plan;

      const mockParticipant = {
        id: 'participant-123',
        userId,
        planId,
      } as Participant;

      const mockVote = {
        id: 'vote-123',
        planId,
      } as Vote;

      const mockVenue = {
        id: venueId,
      } as any;

      planRepository.findById.mockResolvedValue(mockPlan);
      participantRepository.findByPlanIdAndUserId.mockResolvedValue(mockParticipant);
      voteRepository.findActiveByPlanId.mockResolvedValue(mockVote);
      venueRepository.findById.mockResolvedValue(mockVenue);
      voteCastRepository.upsert.mockResolvedValue(undefined);

      // Act
      await service.castVote(planId, userId, venueId);

      // Assert
      expect(voteCastRepository.upsert).toHaveBeenCalledWith('vote-123', planId, userId, venueId);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      // Arrange
      const mockPlan = {
        id: 'plan-123',
        status: 'voting',
      } as Plan;

      planRepository.findById.mockResolvedValue(mockPlan);
      participantRepository.findByPlanIdAndUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.castVote('plan-123', 'user-123', 'venue-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('closePlan', () => {
    it('should close plan and select winner', async () => {
      // Arrange
      const planId = 'plan-123';
      const initiatorId = 'user-123';
      const winnerVenueId = 'venue-123';

      const mockPlan = {
        id: planId,
        initiatorId,
        status: 'voting',
      } as Plan;

      const mockVote = {
        id: 'vote-123',
        planId,
      } as Vote;

      const mockVoteCounts = new Map([
        ['venue-123', 5],
        ['venue-456', 3],
      ]);

      const mockWinnerVenue = {
        id: winnerVenueId,
        name: 'Winner Venue',
      } as any;

      planRepository.findById.mockResolvedValue(mockPlan);
      voteRepository.findActiveByPlanId.mockResolvedValue(mockVote);
      voteCastRepository.getVoteCounts.mockResolvedValue(mockVoteCounts);
      voteRepository.close.mockResolvedValue(undefined);
      planRepository.close.mockResolvedValue({
        ...mockPlan,
        status: 'closed',
        winningVenueId: winnerVenueId,
      } as Plan);
      venueRepository.findById.mockResolvedValue(mockWinnerVenue);
      venueRepository.applyOverrides.mockReturnValue(mockWinnerVenue);

      // Act
      const result = await service.closePlan(planId, initiatorId);

      // Assert
      expect(result.plan.status).toBe('closed');
      expect(result.plan.winningVenueId).toBe(winnerVenueId);
      expect(result.winner.venueId).toBe(winnerVenueId);
      expect(result.winner.voteCount).toBe(5);
    });

    it('should throw ForbiddenException when non-initiator tries to close', async () => {
      // Arrange
      const mockPlan = {
        id: 'plan-123',
        initiatorId: 'user-123',
        status: 'voting',
      } as Plan;

      planRepository.findById.mockResolvedValue(mockPlan);

      // Act & Assert
      await expect(service.closePlan('plan-123', 'user-456')).rejects.toThrow(ForbiddenException);
    });
  });
});
