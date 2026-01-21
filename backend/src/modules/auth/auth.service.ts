import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UpdateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import * as crypto from 'crypto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY FIX: Never allow role to be set during registration
    // All new users are created with default role (MEMBER)
    // Role changes must be done by admin through dedicated endpoints
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      // role is intentionally not set - uses default from entity (MEMBER)
    });

    await this.userRepository.save(user);

    this.logger.log(`User registered: ${user.email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`Tokens refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshToken: undefined });
    this.logger.log(`User logged out: ${userId}`);
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findUserById(id);
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);
    this.logger.log(`User updated: ${user.email}`);
    return user;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.save(user);
    this.logger.log(`Password changed for user: ${user.email}`);
  }

  async deleteUser(id: string, currentUserId?: string): Promise<void> {
    // SECURITY FIX: Prevent admin from deleting their own account
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const user = await this.findUserById(id);
    await this.userRepository.remove(user);
    this.logger.log(`User deleted: ${user.email}`);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({ where: { email } });

    // Always return success message to prevent email enumeration attacks
    if (!user || !user.isActive) {
      this.logger.log(`Password reset requested for non-existent or inactive email: ${email}`);
      return {
        message: 'パスワードリセットの手順をメールで送信しました（登録されている場合）',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Set token and expiry (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.userRepository.save(user);

    this.logger.log(`Password reset token generated for user: ${user.email}`);

    // In production, send email with reset link
    // For now, log the token (in development only)
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Reset token for ${email}: ${resetToken}`);
    }

    // TODO: Implement email sending
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'パスワードリセットの手順をメールで送信しました（登録されている場合）',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find users with non-expired reset tokens only (performance optimized)
    const usersWithValidTokens = await this.userRepository.find({
      where: {
        passwordResetToken: Not(IsNull()),
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    // Find the user with matching token
    let matchedUser: User | null = null;
    for (const user of usersWithValidTokens) {
      const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
      if (isTokenValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException(
        'リセットトークンが無効または期限切れです',
      );
    }

    // Update password and clear reset token
    matchedUser.password = await bcrypt.hash(newPassword, 10);
    matchedUser.passwordResetToken = undefined;
    matchedUser.passwordResetExpires = undefined;
    // Clear refresh token to invalidate all sessions (security best practice)
    matchedUser.refreshToken = undefined;
    await this.userRepository.save(matchedUser);

    this.logger.log(`Password reset successful for user: ${matchedUser.email}`);

    return {
      message: 'パスワードが正常にリセットされました',
    };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    // Find users with non-expired reset tokens only (performance optimized)
    const usersWithValidTokens = await this.userRepository.find({
      where: {
        passwordResetToken: Not(IsNull()),
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    for (const user of usersWithValidTokens) {
      const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
      if (isTokenValid) {
        return { valid: true };
      }
    }
    return { valid: false };
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '1d',
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private mapUserToResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
