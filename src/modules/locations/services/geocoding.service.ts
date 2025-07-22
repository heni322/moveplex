import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GeocodeResult } from '../interfaces/location.interfaces';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.nominatimUrl = this.configService.get('NOMINATIM_URL', 'https://nominatim.openstreetmap.org');
  }

  async geocode(
    query: string,
    limit: number = 5,
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

      return response.data.map((item: any) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
        importance: parseFloat(item.importance),
        boundingBox: item.boundingbox?.map((coord: string) => parseFloat(coord)),
      }));
    } catch (error) {
      this.logger.error(`Geocoding error: ${error.message}`, error.stack);
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

      if (!response.data || response.data.error) {
        return null;
      }

      return {
        displayName: response.data.display_name,
        latitude: parseFloat(response.data.lat),
        longitude: parseFloat(response.data.lon),
        type: response.data.type,
        importance: parseFloat(response.data.importance || '0'),
      };
    } catch (error) {
      this.logger.error(`Reverse geocoding error: ${error.message}`, error.stack);
      return null;
    }
  }
}