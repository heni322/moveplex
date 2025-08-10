import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Repository } from 'typeorm';
import {
  CreatePaymentDto,
  PaymentFilterDto,
  PaymentHistoryResponseDto,
  PaymentResponseDto,
  ProcessPaymentDto,
} from './dto/payments.dto';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

// Define interfaces for query results to fix typing issues
interface TotalAmountResult {
  total: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async createPayment(createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    try {
      const payment = this.paymentRepository.create({
        ...createDto,
        status: PaymentStatus.PENDING,
      });

      const savedPayment = await this.paymentRepository.save(payment);
      return this.mapToResponseDto(savedPayment);
    } catch (error) {
      this.logger.error('Failed to create payment', error);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async processPayment(
    paymentId: string,
    processDto: ProcessPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment has already been processed');
    }

    try {
      // Update payment with processing results
      payment.transactionId = processDto.transactionId;
      payment.gatewayResponse = processDto.gatewayResponse;
      payment.status = processDto.status ?? PaymentStatus.COMPLETED;

      const updatedPayment = await this.paymentRepository.save(payment);
      return this.mapToResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error('Failed to process payment', error);
      throw new InternalServerErrorException('Failed to process payment');
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'ride'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapToResponseDto(payment);
  }

  async getPayments(filterDto: PaymentFilterDto): Promise<PaymentHistoryResponseDto> {
    const {
      userId,
      rideId,
      status,
      paymentMethod,
      paymentType,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

    // Apply filters
    if (userId) {
      queryBuilder.andWhere('payment.userId = :userId', { userId });
    }

    if (rideId) {
      queryBuilder.andWhere('payment.rideId = :rideId', { rideId });
    }

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    if (paymentType) {
      queryBuilder.andWhere('payment.paymentType = :paymentType', {
        paymentType,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('payment.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate });
    }

    if (minAmount) {
      queryBuilder.andWhere('payment.amount >= :minAmount', { minAmount });
    }

    if (maxAmount) {
      queryBuilder.andWhere('payment.amount <= :maxAmount', { maxAmount });
    }

    // Apply sorting
    queryBuilder.orderBy(`payment.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [payments, total] = await queryBuilder.getManyAndCount();

    return {
      payments: payments.map(payment => this.mapToResponseDto(payment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // If no amount specified, refund the full amount
    const refundAmount = amount ?? payment.amount;

    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    try {
      // Create refund data object first
      const refundData: Partial<Payment> = {
        amount: -refundAmount, // Negative amount for refund
        paymentMethod: payment.paymentMethod,
        status: PaymentStatus.COMPLETED,
        transactionId: `refund_${payment.transactionId ?? payment.id}`,
      };

      // Only add properties that exist on the Payment entity
      if ('userId' in payment) {
        refundData.userId = payment.userId;
      }
      if ('rideId' in payment) {
        refundData.rideId = payment.rideId;
      }
      if ('paymentType' in payment) {
        // Use the same type as the original payment or set to a refund type
        refundData.paymentType = payment.paymentType;
      }

      // Create a new refund payment record
      const refundPayment = this.paymentRepository.create(refundData);
      const savedRefund = await this.paymentRepository.save(refundPayment);

      // Update original payment status if full refund
      if (refundAmount === payment.amount) {
        payment.status = PaymentStatus.REFUNDED;
        await this.paymentRepository.save(payment);
      }

      return this.mapToResponseDto(savedRefund);
    } catch (error) {
      this.logger.error('Failed to process refund', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  async getUserPaymentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaymentHistoryResponseDto> {
    const skip = (page - 1) * limit;

    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['ride'],
    });

    return {
      payments: payments.map(payment => this.mapToResponseDto(payment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRidePayments(rideId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentRepository.find({
      where: { rideId },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return payments.map(payment => this.mapToResponseDto(payment));
  }

  // Helper method to map entity to response DTO
  private mapToResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      rideId: payment.rideId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      status: payment.status,
      transactionId: payment.transactionId,
      gatewayResponse: payment.gatewayResponse,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  // Additional utility methods
  async getPaymentsByStatus(status: PaymentStatus): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });

    return payments.map(payment => this.mapToResponseDto(payment));
  }

  async getTotalPaymentAmount(userId: string): Promise<number> {
    const result: TotalAmountResult | undefined = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    return Number(result?.total) || 0;
  }

  async getPaymentStats(userId?: string): Promise<{
    totalPayments: number;
    completedPayments: number;
    failedPayments: number;
    pendingPayments: number;
    totalAmount: number;
  }> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

    if (userId) {
      queryBuilder.where('payment.userId = :userId', { userId });
    }

    const [totalPayments, completedPayments, failedPayments, pendingPayments] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .andWhere('payment.status = :status', {
          status: PaymentStatus.COMPLETED,
        })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('payment.status = :status', { status: PaymentStatus.FAILED })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
        .getCount(),
    ]);

    const totalAmountResult: TotalAmountResult | undefined = await queryBuilder
      .clone()
      .select('SUM(payment.amount)', 'total')
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    return {
      totalPayments,
      completedPayments,
      failedPayments,
      pendingPayments,
      totalAmount: Number(totalAmountResult?.total) || 0,
    };
  }
}
