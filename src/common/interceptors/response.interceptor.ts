import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data: unknown): ApiResponseDto<T> => {
        // If data is already wrapped in ApiResponseDto, return as is
        if (
          typeof data === 'object' &&
          data !== null &&
          Object.prototype.hasOwnProperty.call(data, 'success')
        ) {
          return data as ApiResponseDto<T>;
        }

        // Otherwise, wrap it
        return ApiResponseDto.success(data as T);
      }),
    );
  }
}
