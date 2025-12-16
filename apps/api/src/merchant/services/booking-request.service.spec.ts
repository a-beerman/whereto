import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRequestService } from './booking-request.service';
import { BookingRequestRepository } from '../repositories/booking-request.repository';
import { VenuePartnerRepository } from '../repositories/venue-partner.repository';
import { BookingRequest } from '../entities/booking-request.entity';

describe('BookingRequestService', () => {
  let service: BookingRequestService;
  let bookingRequestRepository: jest.Mocked<BookingRequestRepository>;
  let venuePartnerRepository: jest.Mocked<VenuePartnerRepository>;

  const mockBookingRequestRepository = {
    findById: jest.fn(),
    findByMerchant: jest.fn(),
    countByStatus: jest.fn(),
    update: jest.fn(),
  };

  const mockVenuePartnerRepository = {
    hasAccess: jest.fn(),
    findByVenueId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingRequestService,
        {
          provide: BookingRequestRepository,
          useValue: mockBookingRequestRepository,
        },
        {
          provide: VenuePartnerRepository,
          useValue: mockVenuePartnerRepository,
        },
      ],
    }).compile();

    service = module.get<BookingRequestService>(BookingRequestService);
    bookingRequestRepository = module.get(BookingRequestRepository);
    venuePartnerRepository = module.get(VenuePartnerRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmBooking', () => {
    it('should confirm a booking request', async () => {
      // Arrange
      const merchantUserId = 'merchant-123';
      const bookingRequestId = 'request-123';
      const mockRequest = {
        id: bookingRequestId,
        venueId: 'venue-123',
        status: 'pending',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        requestedDate: new Date('2024-01-15'),
        requestedTime: '19:00',
      } as BookingRequest;

      const mockUpdatedRequest = {
        ...mockRequest,
        status: 'confirmed',
        confirmedTime: new Date('2024-01-15T19:00:00Z'),
        merchantUserId,
        responseTimeSeconds: 300,
      } as BookingRequest;

      bookingRequestRepository.findById.mockResolvedValue(mockRequest);
      venuePartnerRepository.hasAccess.mockResolvedValue(true);
      bookingRequestRepository.update.mockResolvedValue(mockUpdatedRequest);

      // Act
      const result = await service.confirmBooking(merchantUserId, bookingRequestId, {
        confirmedTime: '2024-01-15T19:00:00Z',
      });

      // Assert
      expect(result.status).toBe('confirmed');
      expect(result.merchantUserId).toBe(merchantUserId);
      expect(venuePartnerRepository.hasAccess).toHaveBeenCalledWith(merchantUserId, 'venue-123');
      expect(bookingRequestRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking request does not exist', async () => {
      // Arrange
      bookingRequestRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.confirmBooking('merchant-123', 'non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when merchant does not have access', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-123',
        venueId: 'venue-123',
        status: 'pending',
      } as BookingRequest;

      bookingRequestRepository.findById.mockResolvedValue(mockRequest);
      venuePartnerRepository.hasAccess.mockResolvedValue(false);

      // Act & Assert
      await expect(service.confirmBooking('merchant-123', 'request-123', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when status is not pending or proposed', async () => {
      // Arrange
      const mockRequest = {
        id: 'request-123',
        venueId: 'venue-123',
        status: 'confirmed',
      } as BookingRequest;

      bookingRequestRepository.findById.mockResolvedValue(mockRequest);
      venuePartnerRepository.hasAccess.mockResolvedValue(true);

      // Act & Assert
      await expect(service.confirmBooking('merchant-123', 'request-123', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectBooking', () => {
    it('should reject a booking request', async () => {
      // Arrange
      const merchantUserId = 'merchant-123';
      const bookingRequestId = 'request-123';
      const mockRequest = {
        id: bookingRequestId,
        venueId: 'venue-123',
        status: 'pending',
        createdAt: new Date('2024-01-10T10:00:00Z'),
      } as BookingRequest;

      const mockUpdatedRequest = {
        ...mockRequest,
        status: 'rejected',
        rejectionReason: 'Fully booked',
        merchantUserId,
        responseTimeSeconds: 300,
      } as BookingRequest;

      bookingRequestRepository.findById.mockResolvedValue(mockRequest);
      venuePartnerRepository.hasAccess.mockResolvedValue(true);
      bookingRequestRepository.update.mockResolvedValue(mockUpdatedRequest);

      // Act
      const result = await service.rejectBooking(merchantUserId, bookingRequestId, {
        reason: 'Fully booked',
      });

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Fully booked');
      expect(bookingRequestRepository.update).toHaveBeenCalled();
    });
  });

  describe('createBookingRequest', () => {
    it('should create booking request for partner venue', async () => {
      // Arrange
      const mockPartner = {
        id: 'partner-123',
        venueId: 'venue-123',
        isActive: true,
      };

      const mockBookingRequest = {
        id: 'request-123',
        planId: 'plan-123',
        venueId: 'venue-123',
        requestedDate: new Date('2024-01-15'),
        requestedTime: '19:00',
        participantsCount: 6,
        status: 'pending',
      } as BookingRequest;

      venuePartnerRepository.findByVenueId.mockResolvedValue(mockPartner as any);
      bookingRequestRepository.create = jest.fn().mockResolvedValue(mockBookingRequest);

      // Act
      const result = await service.createBookingRequest({
        planId: 'plan-123',
        venueId: 'venue-123',
        requestedDate: new Date('2024-01-15'),
        requestedTime: '19:00',
        participantsCount: 6,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.venueId).toBe('venue-123');
      expect(venuePartnerRepository.findByVenueId).toHaveBeenCalledWith('venue-123');
    });

    it('should throw BadRequestException for non-partner venue', async () => {
      // Arrange
      venuePartnerRepository.findByVenueId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createBookingRequest({
          planId: 'plan-123',
          venueId: 'venue-123',
          requestedDate: new Date('2024-01-15'),
          requestedTime: '19:00',
          participantsCount: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
