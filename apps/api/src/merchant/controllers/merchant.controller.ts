import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader, ApiParam } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BookingRequestService } from '../services/booking-request.service';
import { MerchantStatsService } from '../services/merchant-stats.service';
import { MerchantAuthGuard } from '../guards/merchant-auth.guard';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { ProposeTimeDto } from '../dto/propose-time.dto';

@ApiTags('Merchant')
@Controller('merchant')
@UseGuards(ThrottlerGuard, MerchantAuthGuard)
export class MerchantController {
  constructor(
    private readonly bookingRequestService: BookingRequestService,
    private readonly merchantStatsService: MerchantStatsService,
  ) {}

  @Get('booking-requests')
  @ApiOperation({ summary: 'Get booking requests for the authenticated merchant' })
  @ApiResponse({ status: 200, description: 'List of booking requests' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'rejected', 'proposed'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiHeader({ name: 'X-Merchant-User-Id', description: 'Merchant User ID', required: true })
  async getBookingRequests(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const merchantUserId = req.merchantUserId;
    const { requests, total, pending } = await this.bookingRequestService.getBookingRequests(
      merchantUserId,
      {
        status: status as any,
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
  @ApiOperation({ summary: 'Confirm a booking request' })
  @ApiParam({ name: 'id', description: 'Booking request ID' })
  @ApiResponse({ status: 200, description: 'Booking request confirmed' })
  @ApiHeader({ name: 'X-Merchant-User-Id', description: 'Merchant User ID', required: true })
  async confirmBooking(@Req() req: any, @Param('id') id: string, @Body() dto: ConfirmBookingDto) {
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
  @ApiOperation({ summary: 'Reject a booking request' })
  @ApiParam({ name: 'id', description: 'Booking request ID' })
  @ApiResponse({ status: 200, description: 'Booking request rejected' })
  @ApiHeader({ name: 'X-Merchant-User-Id', description: 'Merchant User ID', required: true })
  async rejectBooking(@Req() req: any, @Param('id') id: string, @Body() dto: RejectBookingDto) {
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
  @ApiOperation({ summary: 'Propose an alternative time for a booking request' })
  @ApiParam({ name: 'id', description: 'Booking request ID' })
  @ApiResponse({ status: 200, description: 'Alternative time proposed' })
  @ApiHeader({ name: 'X-Merchant-User-Id', description: 'Merchant User ID', required: true })
  async proposeTime(@Req() req: any, @Param('id') id: string, @Body() dto: ProposeTimeDto) {
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
  @ApiOperation({ summary: 'Get statistics for the merchant' })
  @ApiResponse({ status: 200, description: 'Merchant statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiHeader({ name: 'X-Merchant-User-Id', description: 'Merchant User ID', required: true })
  async getStats(
    @Req() req: any,
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
