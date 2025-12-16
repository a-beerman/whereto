import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    service.clearLatencyMetrics();
  });

  describe('trackProductEvent', () => {
    it('should track product events', () => {
      // Arrange
      const event = {
        event: 'search' as const,
        userId: 'user-123',
        cityId: 'city-123',
        query: 'coffee',
        resultCount: 10,
        timestamp: new Date(),
      };

      // Act
      service.trackProductEvent(event);

      // Assert - In a real implementation, we'd verify the event was sent to analytics
      // For now, we just verify it doesn't throw
      expect(() => service.trackProductEvent(event)).not.toThrow();
    });
  });

  describe('recordApiLatency', () => {
    it('should record API latency metrics', () => {
      // Arrange
      const metric = {
        method: 'GET',
        endpoint: '/api/v1/venues',
        duration: 150,
        statusCode: 200,
      };

      // Act
      service.recordApiLatency(metric);

      // Assert
      const stats = service.getLatencyPercentiles('GET', '/api/v1/venues');
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(1);
    });

    it('should keep only last N metrics', () => {
      // Arrange
      const maxMetrics = 1000;
      const metric = {
        method: 'GET',
        endpoint: '/api/v1/venues',
        duration: 150,
        statusCode: 200,
      };

      // Act - Record more than maxMetrics
      for (let i = 0; i < maxMetrics + 100; i++) {
        service.recordApiLatency(metric);
      }

      // Assert
      const stats = service.getLatencyPercentiles('GET', '/api/v1/venues');
      expect(stats?.count).toBeLessThanOrEqual(maxMetrics);
    });
  });

  describe('getLatencyPercentiles', () => {
    it('should calculate percentiles correctly', () => {
      // Arrange
      const endpoint = '/api/v1/venues';
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      durations.forEach((duration) => {
        service.recordApiLatency({
          method: 'GET',
          endpoint,
          duration,
          statusCode: 200,
        });
      });

      // Act
      const stats = service.getLatencyPercentiles('GET', endpoint);

      // Assert
      expect(stats).toBeDefined();
      // For 10 elements, p50 is at index Math.floor(10 * 0.5) = 5, which is 60
      expect(stats?.p50).toBe(60);
      expect(stats?.p95).toBeGreaterThanOrEqual(90);
      expect(stats?.p99).toBeGreaterThanOrEqual(90);
      expect(stats?.count).toBe(10);
    });

    it('should return null when no metrics exist', () => {
      // Act
      const stats = service.getLatencyPercentiles('GET', '/non-existent');

      // Assert
      expect(stats).toBeNull();
    });
  });

  describe('getAllLatencyStats', () => {
    it('should return stats for all endpoints', () => {
      // Arrange
      service.recordApiLatency({
        method: 'GET',
        endpoint: '/api/v1/venues',
        duration: 100,
        statusCode: 200,
      });
      service.recordApiLatency({
        method: 'GET',
        endpoint: '/api/v1/venues/123',
        duration: 50,
        statusCode: 200,
      });

      // Act
      const stats = service.getAllLatencyStats();

      // Assert
      expect(stats).toHaveProperty('GET /api/v1/venues');
      expect(stats).toHaveProperty('GET /api/v1/venues/123');
    });
  });
});
