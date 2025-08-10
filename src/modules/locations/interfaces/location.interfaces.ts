export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyDriver {
  driverId: string;
  userId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rating: number;
  vehicleType: string;
  status: string;
}

export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  importance: number;
  boundingBox?: number[];
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: number[][]; // [longitude, latitude] pairs
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  instruction: string;
  distance: number;
  duration: number;
  type: number;
}

export interface SurgeArea {
  id: string;
  areaName: string;
  multiplier: number;
  isActive: boolean;
}

export interface FareEstimate {
  estimatedFare: number;
  currency: string;
  surgeMultiplier: number;
  breakdown?: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeFare: number;
  };
}
