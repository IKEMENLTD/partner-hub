import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error details' })
  error?: {
    code: string;
    details?: Record<string, unknown> | string | string[];
  };

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: true,
      data,
      message,
    });
  }

  static error<T>(
    message: string,
    code: string,
    details?: Record<string, unknown> | string | string[],
  ): ApiResponseDto<T> {
    return new ApiResponseDto({
      success: false,
      message,
      error: { code, details },
    });
  }
}
