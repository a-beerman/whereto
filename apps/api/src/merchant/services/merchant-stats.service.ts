import { Injectable } from '@nestjs/common';
import { BookingRequestRepository } from '../repositories/booking-request.repository';

export interface MerchantStats {
  totalRequests: number;
  pending: number;
  confirmed: number;
  rejected: number;
  proposed: number;
  averageResponseTimeSeconds: number;
  slaComplianceRate: number; // Percentage of requests responded within target time
}

@Injectable()
export class MerchantStatsService {
  constructor(private readonly bookingRequestRepository: BookingRequestRepository) {}

  async getStats(merchantUserId: string, startDate?: Date, endDate?: Date): Promise<MerchantStats> {
    const filters: any = { merchantUserId };

    // Get all requests for this merchant
    const { requests } = await this.bookingRequestRepository.findByMerchant(merchantUserId, {
      limit: 1000, // Get all for stats calculation
    });

    // Filter by date range if provided
    let filteredRequests = requests;
    if (startDate || endDate) {
      filteredRequests = requests.filter((req) => {
        const createdAt = new Date(req.createdAt);
        if (startDate && createdAt < startDate) return false;
        if (endDate && createdAt > endDate) return false;
        return true;
      });
    }

    const totalRequests = filteredRequests.length;
    const pending = filteredRequests.filter((r) => r.status === 'pending').length;
    const confirmed = filteredRequests.filter((r) => r.status === 'confirmed').length;
    const rejected = filteredRequests.filter((r) => r.status === 'rejected').length;
    const proposed = filteredRequests.filter((r) => r.status === 'proposed').length;

    // Calculate average response time (only for requests that have been responded to)
    const respondedRequests = filteredRequests.filter(
      (r) => r.responseTimeSeconds !== null && r.responseTimeSeconds !== undefined,
    );
    const averageResponseTimeSeconds =
      respondedRequests.length > 0
        ? respondedRequests.reduce((sum, r) => sum + (r.responseTimeSeconds || 0), 0) /
          respondedRequests.length
        : 0;

    // Calculate SLA compliance (target: 5 minutes = 300 seconds)
    const targetResponseTimeSeconds = 300;
    const slaCompliantRequests = respondedRequests.filter(
      (r) => (r.responseTimeSeconds || 0) <= targetResponseTimeSeconds,
    ).length;
    const slaComplianceRate =
      respondedRequests.length > 0 ? (slaCompliantRequests / respondedRequests.length) * 100 : 0;

    return {
      totalRequests,
      pending,
      confirmed,
      rejected,
      proposed,
      averageResponseTimeSeconds: Math.round(averageResponseTimeSeconds),
      slaComplianceRate: Math.round(slaComplianceRate * 100) / 100,
    };
  }
}
