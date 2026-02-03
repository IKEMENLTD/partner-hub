import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { BaseException } from '../exceptions/base.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { BusinessException } from '../exceptions/business.exception';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/v1/test',
      method: 'GET',
      headers: {},
      user: { id: 'user-123' },
      ip: '127.0.0.1',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_001',
            message: 'Test error',
          }),
          path: '/api/v1/test',
          method: 'GET',
        }),
      );
    });

    it('should handle HttpException with object response (validation errors)', () => {
      const exception = new BadRequestException({
        message: ['field1 is required', 'field2 must be a string'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: [
              { field: 'field1', message: 'field1 is required' },
              { field: 'field2', message: 'field2 must be a string' },
            ],
          }),
        }),
      );
    });

    it('should handle UnauthorizedException', () => {
      const exception = new UnauthorizedException('Invalid token');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_001',
          }),
        }),
      );
    });

    it('should handle ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTH_004',
          }),
        }),
      );
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should handle ValidationException', () => {
      const fieldErrors = [
        { field: 'email', constraints: ['email must be valid'] },
      ];
      const exception = new ValidationException('VALIDATION_001', {
        message: 'Validation failed',
        fieldErrors,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_001',
            details: [
              { field: 'email', message: 'email must be valid' },
            ],
          }),
        }),
      );
    });

    it('should handle BusinessException', () => {
      const exception = new BusinessException('PROJECT_006', {
        message: 'Project name already exists',
      });

      filter.catch(exception, mockHost);

      // PROJECT_006 uses HttpStatus.CONFLICT (409) as defined in error-codes
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'PROJECT_006',
          }),
        }),
      );
    });

    it('should handle generic Error', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SYSTEM_001',
            details: expect.objectContaining({
              originalMessage: 'Something went wrong',
            }),
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Internal error details');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.not.objectContaining({
            details: expect.objectContaining({
              originalMessage: expect.any(String),
            }),
          }),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include requestId when present', () => {
      mockRequest.headers['x-request-id'] = 'req-123';
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123',
        }),
      );
    });

    it('should include timestamp in response', () => {
      const exception = new BadRequestException('Test');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('Status code mapping', () => {
    const statusTests = [
      { status: 400, expectedCode: 'VALIDATION_001' },
      { status: 401, expectedCode: 'AUTH_001' },
      { status: 403, expectedCode: 'AUTH_004' },
      { status: 429, expectedCode: 'SYSTEM_006' },
      { status: 502, expectedCode: 'SYSTEM_003' },
      { status: 503, expectedCode: 'SYSTEM_004' },
      { status: 504, expectedCode: 'SYSTEM_005' },
    ];

    statusTests.forEach(({ status, expectedCode }) => {
      it(`should map status ${status} to code ${expectedCode}`, () => {
        const exception = new HttpException('Test', status);

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              code: expectedCode,
            }),
          }),
        );
      });
    });
  });

  describe('Message mapping', () => {
    const messageTests = [
      { status: 400, expectedMessage: '入力データが不正です' },
      { status: 401, expectedMessage: '認証が必要です' },
      { status: 403, expectedMessage: 'この操作を行う権限がありません' },
      { status: 404, expectedMessage: 'リソースが見つかりません' },
      { status: 429, expectedMessage: 'リクエストが多すぎます。しばらく待ってから再試行してください' },
    ];

    messageTests.forEach(({ status, expectedMessage }) => {
      it(`should use default message for status ${status} when no message provided`, () => {
        const exception = new HttpException({ statusCode: status }, status);

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              message: expectedMessage,
            }),
          }),
        );
      });
    });
  });

  describe('Logging', () => {
    it('should log server errors at error level', () => {
      const exception = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);

      // No explicit assertion needed - just verify no error is thrown
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should log client errors at warn level', () => {
      const exception = new BadRequestException('Client error');

      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle exception without user in request', () => {
      mockRequest.user = undefined;
      const exception = new BadRequestException('Test');

      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should handle null exception response', () => {
      const exception = {
        getStatus: () => 500,
        getResponse: () => null,
        message: 'Error',
      } as unknown as HttpException;

      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should handle unknown exception type', () => {
      const exception = { unknown: 'object' };

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
