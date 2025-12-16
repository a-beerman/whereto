import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VenuesService } from './venues.service';
import { VenueRepository } from '../repositories/venue.repository';
import { PhotoService } from './photo.service';
import { HoursService } from './hours.service';
import { Venue } from '../entities/venue.entity';
import { VenueOverrides } from '../entities/venue-overrides.entity';
import { createTestVenue } from '../../test/fixtures/venue.fixtures';

describe('VenuesService', () => {
  let service: VenuesService;
  let venueRepository: jest.Mocked<VenueRepository>;
  let photoService: jest.Mocked<PhotoService>;
  let hoursService: jest.Mocked<HoursService>;

  const mockVenueRepository = {
    search: jest.fn(),
    findById: jest.fn(),
    applyOverrides: jest.fn(),
  };

  const mockPhotoService = {
    getPhotoUrls: jest.fn(),
  };

  const mockHoursService = {
    formatHours: jest.fn(),
    isOpenAt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: VenueRepository,
          useValue: mockVenueRepository,
        },
        {
          provide: PhotoService,
          useValue: mockPhotoService,
        },
        {
          provide: HoursService,
          useValue: mockHoursService,
        },
      ],
    }).compile();

    service = module.get<VenuesService>(VenuesService);
    venueRepository = module.get(VenueRepository);
    photoService = module.get(PhotoService);
    hoursService = module.get(HoursService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return venues matching filters', async () => {
      // Arrange
      const filters = { cityId: 'test-city-id', q: 'coffee' };
      const mockVenues = [createTestVenue({ name: 'Coffee Shop' })];
      const mockResult = {
        venues: mockVenues,
        total: 1,
        nextCursor: undefined,
      };

      venueRepository.search.mockResolvedValue(mockResult);
      venueRepository.applyOverrides.mockImplementation((venue) => venue);
      photoService.getPhotoUrls.mockReturnValue(['photo-url-1']);
      hoursService.formatHours.mockReturnValue(['Mon-Fri: 9AM-10PM']);
      hoursService.isOpenAt.mockReturnValue(true);

      // Act
      const result = await service.search(filters);

      // Assert
      expect(result.venues).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(venueRepository.search).toHaveBeenCalledWith(filters);
      expect(venueRepository.applyOverrides).toHaveBeenCalled();
    });

    it('should apply overrides to venues', async () => {
      // Arrange
      const filters = { cityId: 'test-city-id' };
      const mockVenue = createTestVenue();
      const mockOverrides = {
        nameOverride: 'Overridden Name',
      } as VenueOverrides;
      mockVenue.overrides = [mockOverrides];

      const mockResult = {
        venues: [mockVenue],
        total: 1,
        nextCursor: undefined,
      };

      venueRepository.search.mockResolvedValue(mockResult);
      venueRepository.applyOverrides.mockReturnValue({
        ...mockVenue,
        name: 'Overridden Name',
      } as Venue);
      photoService.getPhotoUrls.mockReturnValue([]);
      hoursService.formatHours.mockReturnValue(undefined);

      // Act
      const result = await service.search(filters);

      // Assert
      expect(venueRepository.applyOverrides).toHaveBeenCalledWith(mockVenue, mockOverrides);
      expect(result.venues[0].name).toBe('Overridden Name');
    });
  });

  describe('findById', () => {
    it('should return venue by id', async () => {
      // Arrange
      const venueId = 'test-venue-id';
      const mockVenue = createTestVenue({ id: venueId });
      venueRepository.findById.mockResolvedValue(mockVenue);
      venueRepository.applyOverrides.mockImplementation((venue) => venue);
      photoService.getPhotoUrls.mockReturnValue([]);
      hoursService.formatHours.mockReturnValue(undefined);

      // Act
      const result = await service.findById(venueId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(venueId);
      expect(venueRepository.findById).toHaveBeenCalledWith(venueId);
    });

    it('should return null when venue not found', async () => {
      // Arrange
      const venueId = 'non-existent-id';
      venueRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById(venueId);

      // Assert
      expect(result).toBeNull();
      expect(venueRepository.findById).toHaveBeenCalledWith(venueId);
    });
  });
});
