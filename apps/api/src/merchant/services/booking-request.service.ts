import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingRequestRepository } from '../repositories/booking-request.repository';
import { VenuePartnerRepository } from '../repositories/venue-partner.repository';
import { BookingRequest } from '../entities/booking-request.entity';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { ProposeTimeDto } from '../dto/propose-time.dto';

@Injectable()
export class BookingRequestService {
  constructor(
    private readonly bookingRequestRepository: BookingRequestRepository,
    private readonly venuePartnerRepository: VenuePartnerRepository,
  ) {}

  async getBookingRequests(
    merchantUserId: string,
    filters: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<{ requests: BookingRequest[]; total: number; pending: number }> {
    const { requests, total } = await this.bookingRequestRepository.findByMerchant(
      merchantUserId,
      filters,
    );

    const pending = await this.bookingRequestRepository.countByStatus(merchantUserId, 'pending');

    return { requests, total, pending };
  }

  async confirmBooking(
    merchantUserId: string,
    bookingRequestId: string,
    dto: ConfirmBookingDto,
  ): Promise<BookingRequest> {
    const bookingRequest = await this.bookingRequestRepository.findById(bookingRequestId);
    if (!bookingRequest) {
      throw new NotFoundException(`Booking request ${bookingRequestId} not found`);
    }

    // Check if merchant has access to this venue
    const hasAccess = await this.venuePartnerRepository.hasAccess(
      merchantUserId,
      bookingRequest.venueId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this venue');
    }

    if (bookingRequest.status !== 'pending' && bookingRequest.status !== 'proposed') {
      throw new BadRequestException(
        `Cannot confirm booking request with status ${bookingRequest.status}`,
      );
    }

    // Calculate response time
    const responseTimeSeconds = Math.floor(
      (new Date().getTime() - bookingRequest.createdAt.getTime()) / 1000,
    );

    const confirmedTime = dto.confirmedTime
      ? new Date(dto.confirmedTime)
      : new Date(`${bookingRequest.requestedDate}T${bookingRequest.requestedTime}`);

    return this.bookingRequestRepository.update(bookingRequestId, {
      status: 'confirmed',
      confirmedTime,
      merchantUserId,
      responseTimeSeconds,
      notes: dto.notes || bookingRequest.notes,
    });
  }

  async rejectBooking(
    merchantUserId: string,
    bookingRequestId: string,
    dto: RejectBookingDto,
  ): Promise<BookingRequest> {
    const bookingRequest = await this.bookingRequestRepository.findById(bookingRequestId);
    if (!bookingRequest) {
      throw new NotFoundException(`Booking request ${bookingRequestId} not found`);
    }

    // Check if merchant has access to this venue
    const hasAccess = await this.venuePartnerRepository.hasAccess(
      merchantUserId,
      bookingRequest.venueId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this venue');
    }

    if (bookingRequest.status !== 'pending' && bookingRequest.status !== 'proposed') {
      throw new BadRequestException(
        `Cannot reject booking request with status ${bookingRequest.status}`,
      );
    }

    // Calculate response time
    const responseTimeSeconds = Math.floor(
      (new Date().getTime() - bookingRequest.createdAt.getTime()) / 1000,
    );

    return this.bookingRequestRepository.update(bookingRequestId, {
      status: 'rejected',
      rejectionReason: dto.reason,
      merchantUserId,
      responseTimeSeconds,
    });
  }

  async proposeTime(
    merchantUserId: string,
    bookingRequestId: string,
    dto: ProposeTimeDto,
  ): Promise<BookingRequest> {
    const bookingRequest = await this.bookingRequestRepository.findById(bookingRequestId);
    if (!bookingRequest) {
      throw new NotFoundException(`Booking request ${bookingRequestId} not found`);
    }

    // Check if merchant has access to this venue
    const hasAccess = await this.venuePartnerRepository.hasAccess(
      merchantUserId,
      bookingRequest.venueId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this venue');
    }

    if (bookingRequest.status !== 'pending') {
      throw new BadRequestException(
        `Cannot propose time for booking request with status ${bookingRequest.status}`,
      );
    }

    // Calculate response time
    const responseTimeSeconds = Math.floor(
      (new Date().getTime() - bookingRequest.createdAt.getTime()) / 1000,
    );

    return this.bookingRequestRepository.update(bookingRequestId, {
      status: 'proposed',
      proposedTime: new Date(dto.proposedTime),
      merchantUserId,
      responseTimeSeconds,
      notes: dto.notes || bookingRequest.notes,
    });
  }

  async createBookingRequest(data: {
    planId: string;
    venueId: string;
    requestedDate: Date;
    requestedTime: string;
    participantsCount: number;
    notes?: string;
  }): Promise<BookingRequest> {
    // Verify venue is a partner venue
    const partner = await this.venuePartnerRepository.findByVenueId(data.venueId);
    if (!partner) {
      throw new BadRequestException('This venue is not a partner venue. Please call directly.');
    }

    return this.bookingRequestRepository.create(data);
  }
}
