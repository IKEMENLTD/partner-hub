import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';

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
    // Supabase JWT secret is base64 encoded, decode it for verification
    const secretBuffer = Buffer.from(jwtSecret, 'base64');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretBuffer,
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<UserProfile> {
    if (payload.role !== 'authenticated') {
      throw new UnauthorizedException('Invalid token');
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
      });
      await this.userProfileRepository.save(userProfile);
    }

    if (!userProfile.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return userProfile;
  }
}
