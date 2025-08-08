import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Ride } from './ride.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentType {
  RIDE_FARE = 'ride_fare',
  TIP = 'tip',
  CANCELLATION_FEE = 'cancellation_fee',
  REFUND = 'refund',
}

// Define PaymentStatus here instead of importing from ride.entity


@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'ride_id', nullable: true })
  rideId?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentType,
    name: 'payment_type',
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.payments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Ride, (ride) => ride.payments)
  @JoinColumn({ name: 'ride_id' })
  ride?: Ride;
}