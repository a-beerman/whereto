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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BookingRequestService } from '../services/booking-request.service';
import { MerchantStatsService } from '../services/merchant-stats.service';
import { MerchantAuthGuard } from '../guards/merchant-auth.guard';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { ProposeTimeDto } from '../dto/propose-time.dto';

@ApiTags('merchant')
@ApiBearerAuth('bearer')
@Controller('merchant')
@UseGuards(ThrottlerGuard, MerchantAuthGuard)
export class MerchantController {
  constructor(
    private readonly bookingRequestService: BookingRequestService,
    private readonly merchantStatsService: MerchantStatsService,
  ) {}

  @Get('booking-requests')
  @ApiOperation({ summary: 'Get pending booking requests for the authenticated merchant' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status: pending, confirmed, rejected',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiOkResponse({
    description: 'List of booking requests',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            pending: { type: 'number' },
          },
        },
      },
    },
  })
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
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: ConfirmBookingDto })
  @ApiOkResponse({
    description: 'Booking request confirmed',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            confirmedAt: { type: 'string', format: 'date-time' },
            responseTimeSeconds: { type: 'number' },
          },
        },
      },
    },
  })
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
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: RejectBookingDto })
  @ApiOkResponse({
    description: 'Booking request rejected',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            rejectedAt: { type: 'string', format: 'date-time' },
            responseTimeSeconds: { type: 'number' },
          },
        },
      },
    },
  })
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
  @ApiParam({ name: 'id', description: 'Booking request ID (UUID)' })
  @ApiBody({ type: ProposeTimeDto })
  @ApiOkResponse({
    description: 'Alternative time proposed',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            proposedTime: { type: 'string', format: 'date-time' },
            proposedAt: { type: 'string', format: 'date-time' },
            responseTimeSeconds: { type: 'number' },
          },
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Get statistics for the merchant venue(s)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiOkResponse({
    description: 'Merchant statistics',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            confirmed: { type: 'number' },
            rejected: { type: 'number' },
            pending: { type: 'number' },
            confirmRate: { type: 'number' },
            medianResponseTimeSeconds: { type: 'number' },
            averageParticipantsPerRequest: { type: 'number' },
          },
        },
      },
    },
  })
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
