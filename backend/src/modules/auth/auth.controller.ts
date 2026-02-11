import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfile } from './entities/user-profile.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Auth Controller - Supabase Edition
 *
 * 認証エンドポイント（login, register, forgot-password等）は削除。
 * これらはフロントエンドからSupabase Authに直接リクエストされる。
 *
 * このコントローラーはプロファイル管理のみを担当。
 * 認証はグローバルSupabaseAuthGuardで処理される。
 */
@ApiTags('Auth')
@Controller('auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ===== User Profile Endpoints =====

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser() user: UserProfile) {
    return this.authService.mapProfileToResponse(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    // Users cannot change their own role or active status
    delete updateProfileDto.role;
    delete updateProfileDto.isActive;
    const profile = await this.authService.updateProfile(userId, updateProfileDto);
    return this.authService.mapProfileToResponse(profile);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('ファイルが選択されていません');
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('画像ファイル（PNG, JPEG, GIF, WebP）のみアップロードできます');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('ファイルサイズは2MB以下にしてください');
    }

    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new BadRequestException('ストレージサービスが利用できません');
    }

    const ext = file.originalname.split('.').pop() || 'png';
    const storagePath = `avatars/${userId}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('project-files')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException('アバターのアップロードに失敗しました');
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('project-files')
      .getPublicUrl(storagePath);

    const avatarUrl = urlData.publicUrl;
    const profile = await this.authService.updateProfile(userId, { avatarUrl });
    return this.authService.mapProfileToResponse(profile);
  }

  // ===== Admin Endpoints =====

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers() {
    const profiles = await this.authService.findAllProfiles();
    return profiles.map((p) => this.authService.mapProfileToResponse(p));
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.authService.findProfileById(id);
    return this.authService.mapProfileToResponse(profile);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const profile = await this.authService.updateProfile(id, updateProfileDto);
    return this.authService.mapProfileToResponse(profile);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot deactivate own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    await this.authService.deactivateUser(id, currentUserId);
    return { message: 'ユーザーを無効化しました' };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.authService.activateUser(id);
    return { message: 'ユーザーを有効化しました' };
  }

  // Note: DELETE endpoint removed - users are managed in Supabase Auth Dashboard
  // Deactivation is preferred over deletion for data integrity
}
