import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';

interface CacheEntry {
  profile: UserProfile;
  cachedAt: number;
}

/**
 * ユーザープロファイルのインメモリキャッシュ
 *
 * SupabaseAuthGuard のDB呼び出し（usersテーブル）をキャッシュし、
 * リクエストごとのDB負荷を軽減する。
 *
 * セキュリティ:
 * - JWT検証はキャッシュしない（毎回Supabaseで検証）
 * - TTL 5分で権限変更の反映遅延を最小化
 * - ユーザー状態変更時に即座にキャッシュ無効化
 */
@Injectable()
export class UserProfileCacheService {
  private readonly logger = new Logger(UserProfileCacheService.name);
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_MAX_SIZE = 1000;
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * キャッシュからプロファイルを取得（TTL超過時はnull）
   */
  get(userId: string): UserProfile | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > UserProfileCacheService.CACHE_TTL_MS) {
      this.cache.delete(userId);
      return null;
    }

    return entry.profile;
  }

  /**
   * プロファイルをキャッシュに保存
   */
  set(userId: string, profile: UserProfile): void {
    if (this.cache.size >= UserProfileCacheService.CACHE_MAX_SIZE) {
      // Map iterates in insertion order - delete the oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(userId, { profile, cachedAt: Date.now() });
  }

  /**
   * 特定ユーザーのキャッシュを無効化
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
    this.logger.debug(`Profile cache invalidated for user: ${userId}`);
  }
}

@Global()
@Module({
  providers: [UserProfileCacheService],
  exports: [UserProfileCacheService],
})
export class UserProfileCacheModule {}
