import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };

  constructor(success: boolean, message: string, data?: T, meta?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success<T>(data?: T, message = 'Success', meta?: any): ApiResponseDto<T> {
    return new ApiResponseDto(true, message, data, meta);
  }

  static error(message: string): ApiResponseDto<null> {
    return new ApiResponseDto(false, message);
  }
}
