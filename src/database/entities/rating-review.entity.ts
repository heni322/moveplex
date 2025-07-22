import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Ride } from './ride.entity';

@Entity('ratings_reviews')
export class RatingReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ride_id' })
  rideId: string;

  @Column({ name: 'rated_by_id' })
  ratedById: string;

  @Column({ name: 'rated_user_id' })
  ratedUserId: string;

  @Column({
    type: 'decimal',
    precision: 2,
    scale: 1,
  })
  rating: number; // 1.0 to 5.0

  @Column({ type: 'text', nullable: true })
  review?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[]; // ['punctual', 'clean_car', 'friendly', etc.]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Ride, (ride) => ride.ratings)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;

  @ManyToOne(() => User, (user) => user.ratingsGiven)
  @JoinColumn({ name: 'rated_by_id' })
  ratedBy: User;

  @ManyToOne(() => User, (user) => user.ratingsReceived)
  @JoinColumn({ name: 'rated_user_id' })
  ratedUser: User;
}