import { ApiProperty } from '@nestjs/swagger';

export interface MetaData {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  meta?: MetaData;

  constructor(success: boolean, message: string, data?: T, meta?: MetaData) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success<T>(data?: T, message = 'Success', meta?: MetaData): ApiResponseDto<T> {
    return new ApiResponseDto(true, message, data, meta);
  }

  static error(message: string): ApiResponseDto<null> {
    return new ApiResponseDto(false, message);
  }
}
