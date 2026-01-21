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
  HttpCode,
  HttpStatus,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Partner already exists' })
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnerService.create(createPartnerDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partners with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of partners' })
  async findAll(@Query() queryDto: QueryPartnerDto) {
    return this.partnerService.findAll(queryDto);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get partner statistics' })
  @ApiResponse({ status: 200, description: 'Partner statistics' })
  async getStatistics() {
    return this.partnerService.getPartnerStatistics();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active partners' })
  @ApiResponse({ status: 200, description: 'List of active partners' })
  async getActivePartners() {
    return this.partnerService.getActivePartners();
  }

  @Get('by-skills')
  @ApiOperation({ summary: 'Get partners by skills' })
  @ApiResponse({ status: 200, description: 'List of partners matching skills' })
  async getBySkills(@Query('skills') skills: string) {
    const skillsArray = skills.split(',').map((s) => s.trim());
    return this.partnerService.getPartnersBySkills(skillsArray);
  }

  @Get(':id/projects')
  @ApiOperation({ summary: 'Get projects associated with a partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of projects for the partner' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getPartnerProjects(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.getProjectsByPartner(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner details' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partnerService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnerService.update(id, updatePartnerDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner status' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner status updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdatePartnerStatusDto,
  ) {
    return this.partnerService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/rating')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update partner rating' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner rating updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 400, description: 'Invalid rating value (must be 1-5)' })
  async updateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRatingDto: UpdatePartnerRatingDto,
  ) {
    return this.partnerService.updateRating(id, updateRatingDto.rating);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.partnerService.remove(id);
    return { message: 'Partner deleted successfully' };
  }
}
