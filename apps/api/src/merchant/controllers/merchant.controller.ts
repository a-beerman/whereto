import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BookingRequestService } from '../services/booking-request.service';
import { MerchantStatsService } from '../services/merchant-stats.service';
import { MerchantAuthGuard } from '../guards/merchant-auth.guard';
import { ConfirmBooking } from '../dto/confirm-booking';
import { RejectBooking } from '../dto/reject-booking';
import { ProposeTime } from '../dto/propose-time';
import {
  GetBookingRequestsResponse,
  ConfirmBookingResponse,
  RejectBookingResponse,
  ProposeTimeResponse,
  GetStatsResponse,
} from '../dto/merchant-responses';
import { BookingRequest } from '../dto/booking-request';

@ApiTags('merchant')
@ApiBearerAuth('bearer')
@ApiExtraModels(
  GetBookingRequestsResponse,
  ConfirmBookingResponse,
  RejectBookingResponse,
  ProposeTimeResponse,
  GetStatsResponse,
  BookingRequest,
)
@Controller('merchant')
@UseGuards(ThrottlerGuard, MerchantAuthGuard)
export class MerchantController {
  constructor(
    private readonly bookingRequestService: BookingRequestService,
    private readonly merchantStatsService: MerchantStatsService,
  ) {}

  @Get('booking-requests')
  @ApiOperation({
    summary: 'Get pending booking requests for the authenticated merchant',
    operationId: 'Merchant_getBookingRequests',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status: pending, confirmed, rejected',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiOkResponse({
    description: 'List of booking requests',
    type: GetBookingRequestsResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getBookingRequests(
    @Req() req: Request & { merchantUserId: string },
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const merchantUserId = req.merchantUserId;
    const { requests, total, pending } = await this.bookingRequestService.getBookingRequests(
      merchantUserId,
      {
        status: status as
          | 'pending'
          | 'confirmed'
          | 'rejected'
          | 'proposed'
          | 'cancelled'
          | undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    return {
      data: requests,
      meta: {
        total,
        pending,
      },
    };
  }

  @Post('booking-requests/:id/confirm')
  @ApiOperation({ summary: 'Confirm a booking request', operationId: 'Merchant_confirmBooking' })
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: ConfirmBooking })
  @ApiOkResponse({
    description: 'Booking request confirmed',
    type: ConfirmBookingResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async confirmBooking(
    @Req() req: Request & { merchantUserId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmBooking,
  ) {
    const merchantUserId = req.merchantUserId;
    const bookingRequest = await this.bookingRequestService.confirmBooking(merchantUserId, id, dto);

    return {
      data: {
        id: bookingRequest.id,
        status: bookingRequest.status,
        confirmedAt: bookingRequest.confirmedTime,
        responseTimeSeconds: bookingRequest.responseTimeSeconds,
      },
    };
  }

  @Post('booking-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a booking request', operationId: 'Merchant_rejectBooking' })
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: RejectBooking })
  @ApiOkResponse({
    description: 'Booking request rejected',
    type: RejectBookingResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async rejectBooking(
    @Req() req: Request & { merchantUserId: string },
    @Param('id') id: string,
    @Body() dto: RejectBooking,
  ) {
    const merchantUserId = req.merchantUserId;
    const bookingRequest = await this.bookingRequestService.rejectBooking(merchantUserId, id, dto);

    return {
      data: {
        id: bookingRequest.id,
        status: bookingRequest.status,
        rejectedAt: bookingRequest.updatedAt,
        responseTimeSeconds: bookingRequest.responseTimeSeconds,
      },
    };
  }

  @Post('booking-requests/:id/propose-time')
  @ApiOperation({
    summary: 'Propose an alternative time for a booking request',
    operationId: 'Merchant_proposeTime',
  })
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: ProposeTime })
  @ApiOkResponse({
    description: 'Alternative time proposed',
    type: ProposeTimeResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async proposeTime(
    @Req() req: Request & { merchantUserId: string },
    @Param('id') id: string,
    @Body() dto: ProposeTime,
  ) {
    const merchantUserId = req.merchantUserId;
    const bookingRequest = await this.bookingRequestService.proposeTime(merchantUserId, id, dto);

    return {
      data: {
        id: bookingRequest.id,
        status: bookingRequest.status,
        proposedTime: bookingRequest.proposedTime,
        proposedAt: bookingRequest.updatedAt,
        responseTimeSeconds: bookingRequest.responseTimeSeconds,
      },
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get statistics for the merchant venue(s)',
    operationId: 'Merchant_getStats',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({
    description: 'Merchant statistics',
    type: GetStatsResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getStats(
    @Req() req: Request & { merchantUserId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const merchantUserId = req.merchantUserId;
    const stats = await this.merchantStatsService.getStats(
      merchantUserId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return { data: stats };
  }
}
