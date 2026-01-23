import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StakeholderService } from './stakeholder.service';
import {
  CreateStakeholderDto,
  UpdateStakeholderDto,
  QueryStakeholderDto,
  UpdateStakeholderTierDto,
  StakeholderTreeResponseDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Stakeholders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class StakeholderController {
  constructor(private readonly stakeholderService: StakeholderService) {}

  // ============================================
  // Project-scoped stakeholder endpoints
  // ============================================

  @Post('projects/:projectId/stakeholders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a stakeholder to a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Stakeholder added successfully' })
  @ApiResponse({ status: 404, description: 'Project or partner not found' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createStakeholderDto: CreateStakeholderDto,
  ) {
    // Override projectId from URL path
    return this.stakeholderService.create({
      ...createStakeholderDto,
      projectId,
    });
  }

  @Get('projects/:projectId/stakeholders')
  @ApiOperation({ summary: 'Get all stakeholders for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of stakeholders' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAllByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() queryDto: QueryStakeholderDto,
  ) {
    return this.stakeholderService.findAllByProject(projectId, queryDto);
  }

  @Get('projects/:projectId/stakeholders/tree')
  @ApiOperation({ summary: 'Get stakeholder tree structure for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Stakeholder tree structure',
    type: StakeholderTreeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getStakeholderTree(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<StakeholderTreeResponseDto> {
    return this.stakeholderService.getStakeholderTree(projectId);
  }

  @Get('projects/:projectId/stakeholders/by-tier/:tier')
  @ApiOperation({ summary: 'Get stakeholders by tier for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'tier', description: 'Tier level (1, 2, or 3)' })
  @ApiResponse({ status: 200, description: 'List of stakeholders for the specified tier' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getStakeholdersByTier(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('tier', ParseIntPipe) tier: number,
  ) {
    return this.stakeholderService.getStakeholdersByTier(projectId, tier);
  }

  @Get('projects/:projectId/stakeholders/primary')
  @ApiOperation({ summary: 'Get primary stakeholders for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of primary stakeholders' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getPrimaryStakeholders(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.stakeholderService.getPrimaryStakeholders(projectId);
  }

  // ============================================
  // Direct stakeholder endpoints (by stakeholder ID)
  // ============================================

  @Get('stakeholders/:id')
  @ApiOperation({ summary: 'Get stakeholder by ID' })
  @ApiParam({ name: 'id', description: 'Stakeholder ID' })
  @ApiResponse({ status: 200, description: 'Stakeholder details' })
  @ApiResponse({ status: 404, description: 'Stakeholder not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stakeholderService.findOne(id);
  }

  @Patch('stakeholders/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update stakeholder' })
  @ApiParam({ name: 'id', description: 'Stakeholder ID' })
  @ApiResponse({ status: 200, description: 'Stakeholder updated successfully' })
  @ApiResponse({ status: 404, description: 'Stakeholder not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStakeholderDto: UpdateStakeholderDto,
  ) {
    return this.stakeholderService.update(id, updateStakeholderDto);
  }

  @Patch('stakeholders/:id/tier')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update stakeholder tier' })
  @ApiParam({ name: 'id', description: 'Stakeholder ID' })
  @ApiResponse({ status: 200, description: 'Stakeholder tier updated successfully' })
  @ApiResponse({ status: 404, description: 'Stakeholder not found' })
  @ApiResponse({ status: 400, description: 'Invalid tier value (must be 1-3)' })
  async updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTierDto: UpdateStakeholderTierDto,
  ) {
    return this.stakeholderService.updateTier(id, updateTierDto.tier);
  }

  @Delete('stakeholders/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete stakeholder' })
  @ApiParam({ name: 'id', description: 'Stakeholder ID' })
  @ApiResponse({ status: 204, description: 'Stakeholder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Stakeholder not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.stakeholderService.remove(id);
  }
}
