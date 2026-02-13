import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserProfile } from './entities/user-profile.entity';
import { SuperAdminSeedService } from './super-admin-seed.service';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationMember } from '../organization/entities/organization-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, Organization, OrganizationMember])],
  controllers: [AuthController, SuperAdminController],
  providers: [AuthService, SuperAdminSeedService, SuperAdminService],
  exports: [AuthService],
})
export class AuthModule {}
