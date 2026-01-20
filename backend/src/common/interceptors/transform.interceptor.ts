import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // PaginatedResponseDto の場合（data配列 + meta オブジェクト）
        if (data?.data && data?.meta && Array.isArray(data.data)) {
          return {
            success: true,
            data,
            timestamp: new Date().toISOString(),
          };
        }
        // 既にレスポンスオブジェクト（success フィールド持ち）の場合
        if (data?.success !== undefined) {
          return data;
        }
        // 通常のデータはラップ
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
