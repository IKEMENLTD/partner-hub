import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserProfile } from './entities/user-profile.entity';
import { SupabaseJwtStrategy } from './strategies/supabase-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile]),
    PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy],
  exports: [AuthService, SupabaseJwtStrategy, PassportModule],
})
export class AuthModule {}
