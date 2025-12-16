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
import { ThrottlerGuard } from '@nestjs/throttler';
import { BookingRequestService } from '../services/booking-request.service';
import { MerchantStatsService } from '../services/merchant-stats.service';
import { MerchantAuthGuard } from '../guards/merchant-auth.guard';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { ProposeTimeDto } from '../dto/propose-time.dto';

@Controller('merchant')
@UseGuards(ThrottlerGuard, MerchantAuthGuard)
export class MerchantController {
  constructor(
    private readonly bookingRequestService: BookingRequestService,
    private readonly merchantStatsService: MerchantStatsService,
  ) {}

  @Get('booking-requests')
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
