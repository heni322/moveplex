import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { 
  CreatePaymentDto, 
  ProcessPaymentDto, 
  PaymentFilterDto 
} from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body(ValidationPipe) createDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createDto);
  }

  @Post(':paymentId/process')
  async processPayment(
    @Param('paymentId') paymentId: string,
    @Body(ValidationPipe) processDto: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(paymentId, processDto);
  }

  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }

  @Get()
  async getPayments(@Query(ValidationPipe) filterDto: PaymentFilterDto) {
    return this.paymentsService.getPayments(filterDto);
  }

  @Put(':paymentId/refund')
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentsService.refundPayment(paymentId, amount);
  }

  @Get('user/:userId/history')
  async getUserPaymentHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.paymentsService.getUserPaymentHistory(userId, page, limit);
  }

  @Get('ride/:rideId/payments')
  async getRidePayments(@Param('rideId') rideId: string) {
    return this.paymentsService.getRidePayments(rideId);
  }
}
