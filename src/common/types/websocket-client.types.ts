export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export interface RideRequest {
  id: string;
  riderId: string;
  pickupLocation: LocationUpdate;
  destination: LocationUpdate;
  rideType: string;
  estimatedFare: number;
}

export interface RideMatch {
  rideRequestId: string;
  driverId: string;
  riderId: string;
  estimatedArrival: number;
  driverLocation: LocationUpdate;
}

export interface RideProgress {
  rideId: string;
  status: 'assigned' | 'pickup' | 'in-progress' | 'completed' | 'cancelled';
  driverLocation?: LocationUpdate;
  estimatedArrival?: number;
  progress?: number;
}

export interface NotificationData {
  id: string;
  type: 'ride_request' | 'ride_accepted' | 'ride_cancelled' | 'payment' | 'surge_pricing';
  title: string;
  message: string;
  data?: unknown;
}

export interface SurgePricingUpdate {
  areaId: string;
  multiplier: number;
  reason: string;
  validUntil: Date;
  coordinates: Array<{ lat: number; lng: number }>;
}
  