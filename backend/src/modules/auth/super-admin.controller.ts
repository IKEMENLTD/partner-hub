import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Super Admin')
@Controller('super-admin')
@ApiBearerAuth()
@SuperAdmin()
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'System stats' })
  async getStats() {
    return this.superAdminService.getStats();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all organizations' })
  @ApiResponse({ status: 200, description: 'All organizations' })
  async getAllOrganizations() {
    return this.superAdminService.findAllOrganizations();
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted' })
  async deleteOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.deleteOrganization(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users across organizations' })
  @ApiResponse({ status: 200, description: 'All users' })
  async getAllUsers() {
    return this.superAdminService.findAllUsers();
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user completely' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.superAdminService.deleteUser(id, currentUserId);
  }

  @Post('users/:id/set-super-admin')
  @ApiOperation({ summary: 'Grant super admin privileges' })
  @ApiResponse({ status: 200, description: 'Super admin granted' })
  async setSuperAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.setSuperAdmin(id);
  }

  @Post('users/:id/revoke-super-admin')
  @ApiOperation({ summary: 'Revoke super admin privileges' })
  @ApiResponse({ status: 200, description: 'Super admin revoked' })
  async revokeSuperAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.superAdminService.revokeSuperAdmin(id, currentUserId);
  }
}
