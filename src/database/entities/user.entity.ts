import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { DriverProfile } from './driver-profile.entity';
import { Ride } from './ride.entity';
import { Payment } from './payment.entity';
import { RatingReview } from './rating-review.entity';
import { UserType } from '../../common/enums/user-types.enum';
import { RefreshToken } from './refresh-token.entity';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'profile_picture_url', length: 500, nullable: true })
  profilePictureUrl?: string;

  @Column({
    type: 'enum',
    enum: UserType,
    name: 'user_type',
  })
  userType: UserType;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => DriverProfile, (driverProfile) => driverProfile.user)
  driverProfile?: DriverProfile;

  @OneToMany(() => Ride, (ride) => ride.rider)
  ridesAsRider: Ride[];

  @OneToMany(() => Ride, (ride) => ride.driver)
  ridesAsDriver: Ride[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => RatingReview, (rating) => rating.ratedBy)
  ratingsGiven: RatingReview[];

  @OneToMany(() => RatingReview, (rating) => rating.ratedUser)
  ratingsReceived: RatingReview[];

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'password_changed_at', nullable: true })
  passwordChangedAt?: Date;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];
}