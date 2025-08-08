import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GeocodeResult } from '../interfaces/location.interfaces';

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: string;
  boundingbox?: string[];
}

interface NominatimReverseResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance?: string;
  error?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.nominatimUrl = this.configService.get<string>('NOMINATIM_URL') ?? 'https://nominatim.openstreetmap.org';
  }

  async geocode(
    query: string,
    limit = 5,
    countryCode?: string,
  ): Promise<GeocodeResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: limit.toString(),
        ...(countryCode && { countrycodes: countryCode }),
      });

      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimUrl}/search?${params}`, {
          headers: {
            'User-Agent': 'UberCloneApp/1.0',
          },
        }),
      );

      const data = response.data as NominatimSearchResult[];
      
      return data.map((item: NominatimSearchResult) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
        importance: parseFloat(item.importance),
        boundingBox: item.boundingbox?.map((coord: string) => parseFloat(coord)),
      }));
    } catch (error) {
      this.logger.error(`Geocoding error: ${(error as Error).message}`, (error as Error).stack);
      throw new Error('Geocoding service unavailable');
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodeResult | null> {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimUrl}/reverse?${params}`, {
          headers: {
            'User-Agent': 'UberCloneApp/1.0',
          },
        }),
      );

      const data = response.data as NominatimReverseResult;

      if (!data || data.error) {
        return null;
      }

      return {
        displayName: data.display_name,
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        type: data.type,
        importance: parseFloat(data.importance ?? '0'),
      };
    } catch (error) {
      this.logger.error(`Reverse geocoding error: ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }
}