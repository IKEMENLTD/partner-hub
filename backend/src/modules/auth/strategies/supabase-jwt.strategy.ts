import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { UserRole } from '../enums/user-role.enum';

export interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role: string;
  aud: string;
  exp: number;
  iat: number;
  app_metadata?: {
    provider?: string;
  };
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private readonly logger = new Logger(SupabaseJwtStrategy.name);

  constructor(
    configService: ConfigService,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {
    const jwtSecret = configService.get<string>('supabase.jwtSecret') || '';

    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET is not configured');
    }

    // Supabase JWT secret is base64 encoded, decode it for verification
    const secretBuffer = Buffer.from(jwtSecret, 'base64');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretBuffer,
      algorithms: ['HS256'],
    });

    this.logger.log(`SupabaseJwtStrategy initialized, secret length: ${jwtSecret.length}, decoded length: ${secretBuffer.length}`);
  }

  async validate(payload: SupabaseJwtPayload): Promise<UserProfile> {
    this.logger.debug(`Validating JWT payload: sub=${payload.sub}, email=${payload.email}, role=${payload.role}`);

    if (payload.role !== 'authenticated') {
      this.logger.warn(`Invalid token role: ${payload.role}`);
      throw new UnauthorizedException('Invalid token role');
    }

    let userProfile = await this.userProfileRepository.findOne({
      where: { id: payload.sub },
    });

    if (!userProfile) {
      this.logger.log(`Creating profile for new user: ${payload.email}`);
      userProfile = this.userProfileRepository.create({
        id: payload.sub,
        email: payload.email,
        firstName: payload.user_metadata?.first_name || '',
        lastName: payload.user_metadata?.last_name || '',
        role: UserRole.MEMBER,
        isActive: true,
      });
      await this.userProfileRepository.save(userProfile);
      this.logger.log(`Profile created successfully for user: ${payload.email}`);
    }

    if (!userProfile.isActive) {
      this.logger.warn(`User is inactive: ${payload.email}`);
      throw new UnauthorizedException('User is inactive');
    }

    this.logger.debug(`User authenticated: ${payload.email}, role=${userProfile.role}`);
    return userProfile;
  }
}
