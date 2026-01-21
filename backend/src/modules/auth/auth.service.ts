import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from './enums/user-role.enum';

/**
 * Auth Service - Supabase Edition
 *
 * 認証処理はSupabase Authに委譲。
 * このサービスはユーザープロファイルの管理のみを担当。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
  ) {}

  /**
   * プロファイルをIDで取得
   */
  async findProfileById(id: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return profile;
  }

  /**
   * 全プロファイルを取得（管理者用）
   */
  async findAllProfiles(): Promise<UserProfile[]> {
    return this.profileRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * プロファイルを更新
   */
  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.findProfileById(id);
    Object.assign(profile, updateProfileDto);
    await this.profileRepository.save(profile);
    this.logger.log(`Profile updated: ${profile.email}`);
    return profile;
  }

  /**
   * ユーザーロールを更新（管理者用）
   */
  async updateUserRole(id: string, role: UserRole): Promise<UserProfile> {
    const profile = await this.findProfileById(id);
    profile.role = role;
    await this.profileRepository.save(profile);
    this.logger.log(`Role updated for ${profile.email}: ${role}`);
    return profile;
  }

  /**
   * ユーザーを無効化（管理者用）
   */
  async deactivateUser(id: string, currentUserId?: string): Promise<void> {
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    const profile = await this.findProfileById(id);
    profile.isActive = false;
    await this.profileRepository.save(profile);
    this.logger.log(`User deactivated: ${profile.email}`);
  }

  /**
   * ユーザーを有効化（管理者用）
   */
  async activateUser(id: string): Promise<void> {
    const profile = await this.findProfileById(id);
    profile.isActive = true;
    await this.profileRepository.save(profile);
    this.logger.log(`User activated: ${profile.email}`);
  }

  /**
   * 最終ログイン日時を更新
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.profileRepository.update(id, { lastLoginAt: new Date() });
  }

  /**
   * プロファイルを同期（Supabase Webhook用）
   */
  async syncProfile(
    supabaseUserId: string,
    email: string,
    metadata?: { firstName?: string; lastName?: string },
  ): Promise<UserProfile> {
    let profile = await this.profileRepository.findOne({
      where: { id: supabaseUserId },
    });

    if (!profile) {
      profile = this.profileRepository.create({
        id: supabaseUserId,
        email,
        firstName: metadata?.firstName || '',
        lastName: metadata?.lastName || '',
      });
    } else {
      profile.email = email;
      if (metadata?.firstName) profile.firstName = metadata.firstName;
      if (metadata?.lastName) profile.lastName = metadata.lastName;
    }

    await this.profileRepository.save(profile);
    this.logger.log(`Profile synced: ${email}`);
    return profile;
  }

  /**
   * プロファイル情報をレスポンス形式に変換
   */
  mapProfileToResponse(profile: UserProfile) {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      isActive: profile.isActive,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
    };
  }
}
