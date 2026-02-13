import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UserRole } from './enums/user-role.enum';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SuperAdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminSeedService.name);

  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    private supabaseService: SupabaseService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.log('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set, skipping super admin seed');
      return;
    }

    try {
      // Check if profile already exists by email
      const existingProfile = await this.profileRepository.findOne({
        where: { email },
      });

      if (existingProfile) {
        if (!existingProfile.isSuperAdmin) {
          existingProfile.isSuperAdmin = true;
          await this.profileRepository.save(existingProfile);
          this.logger.log(`Super admin flag set for existing user: ${email}`);
        } else {
          this.logger.log(`Super admin already exists: ${email}`);
        }
        return;
      }

      // Create user in Supabase Auth
      const supabaseAdmin = this.supabaseService.admin;
      if (!supabaseAdmin) {
        this.logger.error('Supabase admin client not available, cannot create super admin');
        return;
      }

      // Try to find existing Supabase auth user
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        this.logger.error(`Failed to list Supabase auth users: ${listError.message}`);
        return;
      }
      const existingAuthUser = existingUsers?.users?.find((u) => u.email === email);

      let userId: string;

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        this.logger.log(`Found existing Supabase auth user for: ${email}`);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          this.logger.error(`Failed to create super admin in Supabase Auth: ${createError.message}`);
          return;
        }

        userId = newUser.user.id;
        this.logger.log(`Created Supabase auth user for super admin: ${email}`);
      }

      // Create profile
      const profile = this.profileRepository.create({
        id: userId,
        email,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
        isSuperAdmin: true,
      });
      await this.profileRepository.save(profile);
      this.logger.log(`Super admin profile created: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to seed super admin: ${error.message}`, error.stack);
    }
  }
}
