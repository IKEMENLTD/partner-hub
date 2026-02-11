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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  QueryPartnerDto,
  UpdatePartnerStatusDto,
  UpdatePartnerRatingDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PartnerAccessGuard } from './guards/partner-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partners')
export class PartnerController {
  constructor(
    private readonly partnerService: PartnerService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Partner already exists' })
  async create(@Body() createPartnerDto: CreatePartnerDto, @CurrentUser('id') userId: string) {
    return this.partnerService.create(createPartnerDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get all partners with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of partners' })
  async findAll(@Query() queryDto: QueryPartnerDto, @CurrentUser('id') userId: string) {
    return this.partnerService.findAll(queryDto, userId);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get partner statistics' })
  @ApiResponse({ status: 200, description: 'Partner statistics' })
  async getStatistics() {
    return this.partnerService.getPartnerStatistics();
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get all active partners' })
  @ApiResponse({ status: 200, description: 'List of active partners' })
  async getActivePartners() {
    return this.partnerService.getActivePartners();
  }

  @Get('by-skills')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get partners by skills' })
  @ApiResponse({ status: 200, description: 'List of partners matching skills' })
  async getBySkills(@Query('skills') skills: string) {
    const skillsArray = skills.split(',').map((s) => s.trim());
    return this.partnerService.getPartnersBySkills(skillsArray);
  }

  @Get('deleted')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get soft-deleted partners' })
  @ApiResponse({ status: 200, description: 'List of soft-deleted partners' })
  async findDeleted() {
    return this.partnerService.findDeleted();
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner restored successfully' })
  @ApiResponse({ status: 404, description: 'Deleted partner not found' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.restore(id);
  }

  @Get(':id/projects')
  @UseGuards(PartnerAccessGuard)
  @ApiOperation({ summary: 'Get projects associated with a partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of projects for the partner' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPartnerProjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.getProjectsByPartner(id);
  }

  @Get(':id')
  @UseGuards(PartnerAccessGuard)
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner details' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePartnerDto: UpdatePartnerDto) {
    return this.partnerService.update(id, updatePartnerDto);
  }

  @Patch(':id/status')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update partner status' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner status updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdatePartnerStatusDto,
  ) {
    return this.partnerService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/rating')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update partner rating' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner rating updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid rating value (must be 1-5)' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRatingDto: UpdatePartnerRatingDto,
  ) {
    return this.partnerService.updateRating(id, updateRatingDto.rating);
  }

  // ==================== Delete Endpoint ====================

  @Delete(':id')
  @UseGuards(PartnerAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.partnerService.remove(id);
    return { message: 'パートナーを削除しました' };
  }
}
